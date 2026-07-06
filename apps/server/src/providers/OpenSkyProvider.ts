import { geodeticToSky } from "@skyceil/geo";
import type { AircraftSnapshot, ObserverLocation } from "@skyceil/shared";
import type {
  FetchAircraftInput,
  FlightDataProvider,
} from "./FlightDataProvider.js";

type OpenSkyStateVector = [
  string,
  string | null,
  string | null,
  number | null,
  number | null,
  number | null,
  number | null,
  number | null,
  boolean,
  number | null,
  number | null,
  number | null,
  number[] | null,
  number | null,
  string | null,
  boolean,
  number,
  number | null,
];

type OpenSkyResponse = {
  time: number;
  states: OpenSkyStateVector[] | null;
};

type TokenResponse = {
  access_token: string;
  expires_in?: number;
};

export type OpenSkyProviderOptions = {
  baseUrl: string;
  authUrl: string;
  clientId?: string;
  clientSecret?: string;
  timeoutMs?: number;
};

export class OpenSkyProvider implements FlightDataProvider {
  readonly source = "opensky" as const;
  private accessToken?: string;
  private tokenExpiresAt = 0;
  private readonly timeoutMs: number;

  constructor(private readonly options: OpenSkyProviderOptions) {
    this.timeoutMs = options.timeoutMs ?? 10_000;
  }

  async fetchAircraft(input: FetchAircraftInput): Promise<AircraftSnapshot[]> {
    const url = new URL(
      `${this.options.baseUrl.replace(/\/$/, "")}/states/all`,
    );
    url.searchParams.set("lamin", String(input.bounds.minLatitude));
    url.searchParams.set("lomin", String(input.bounds.minLongitude));
    url.searchParams.set("lamax", String(input.bounds.maxLatitude));
    url.searchParams.set("lomax", String(input.bounds.maxLongitude));

    const headers: Record<string, string> = {};
    const accessToken = await this.getAccessToken();
    if (accessToken) {
      headers.Authorization = `Bearer ${accessToken}`;
    }

    const payload = await fetchJson<OpenSkyResponse>(url, {
      headers,
      timeoutMs: this.timeoutMs,
    });

    return (payload.states ?? [])
      .map((state) =>
        normalizeOpenSkyStateVector(state, input.observer, input.now),
      )
      .filter((snapshot): snapshot is AircraftSnapshot => Boolean(snapshot));
  }

  private async getAccessToken(): Promise<string | undefined> {
    if (!this.options.clientId || !this.options.clientSecret) {
      return undefined;
    }

    if (this.accessToken && Date.now() < this.tokenExpiresAt) {
      return this.accessToken;
    }

    const body = new URLSearchParams({
      grant_type: "client_credentials",
      client_id: this.options.clientId,
      client_secret: this.options.clientSecret,
    });
    const token = await fetchJson<TokenResponse>(this.options.authUrl, {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
      },
      body,
      timeoutMs: this.timeoutMs,
    });

    this.accessToken = token.access_token;
    this.tokenExpiresAt =
      Date.now() + Math.max(60, (token.expires_in ?? 1800) - 60) * 1000;

    return this.accessToken;
  }
}

export function normalizeOpenSkyStateVector(
  state: OpenSkyStateVector,
  observer: ObserverLocation,
  now: Date,
): AircraftSnapshot | undefined {
  const icao = state[0]?.trim().toLowerCase();
  const longitude = state[5];
  const latitude = state[6];

  if (
    !icao ||
    typeof latitude !== "number" ||
    typeof longitude !== "number" ||
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude)
  ) {
    return undefined;
  }

  const altitudeMeters = finiteNumber(state[13]) ?? finiteNumber(state[7]) ?? 0;
  const speedMetersPerSecond = finiteNumber(state[9]) ?? 0;
  const headingDegrees = finiteNumber(state[10]) ?? 0;
  const verticalRateMetersPerSecond = finiteNumber(state[11]) ?? 0;
  const lastContactSeconds = finiteNumber(state[4]) ?? finiteNumber(state[3]);
  const updatedAt = lastContactSeconds
    ? new Date(lastContactSeconds * 1000).toISOString()
    : now.toISOString();
  const sky = geodeticToSky(observer, {
    latitude,
    longitude,
    altitudeMeters,
  });
  const callsign = state[1]?.trim();
  const snapshot: AircraftSnapshot = {
    icao,
    latitude,
    longitude,
    altitudeMeters,
    speedMetersPerSecond,
    headingDegrees,
    verticalRateMetersPerSecond,
    azimuthDegrees: sky.azimuthDegrees,
    elevationDegrees: sky.elevationDegrees,
    distanceMeters: sky.distanceMeters,
    updatedAt,
    source: "opensky",
  };

  if (callsign) {
    snapshot.flightNumber = callsign;
  }

  return snapshot;
}

function finiteNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : undefined;
}

async function fetchJson<T>(
  input: URL | string,
  init: RequestInit & { timeoutMs: number },
): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), init.timeoutMs);

  try {
    const response = await fetch(input, {
      ...init,
      signal: controller.signal,
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(
        `OpenSky request failed ${response.status}: ${body.slice(0, 240)}`,
      );
    }

    return (await response.json()) as T;
  } finally {
    clearTimeout(timeout);
  }
}
