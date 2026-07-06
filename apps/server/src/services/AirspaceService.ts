import { boundingBoxForRadius, haversineDistanceMeters } from "@skyceil/geo";
import type {
  AircraftSnapshot,
  AppConfig,
  ObserverLocation,
} from "@skyceil/shared";
import type { FlightDataProvider } from "../providers/FlightDataProvider.js";
import type { MetadataEnricher } from "./MetadataEnricher.js";

export type AirspaceRefreshResult = {
  aircraft: AircraftSnapshot[];
  removed: string[];
};

export type ObserverUpdate = {
  latitude?: number | undefined;
  longitude?: number | undefined;
  altitudeMeters?: number | undefined;
  radiusKm?: number | undefined;
};

export class AirspaceService {
  private readonly current = new Map<string, AircraftSnapshot>();
  private observer: ObserverLocation;
  private radiusKm: number;

  constructor(
    private readonly config: AppConfig,
    private readonly provider: FlightDataProvider,
    private readonly metadataEnricher: MetadataEnricher,
  ) {
    this.observer = { ...config.userLocation };
    this.radiusKm = config.flightData.radiusKm;
  }

  get source() {
    return this.provider.source;
  }

  getObserver(): ObserverLocation {
    return this.observer;
  }

  updateObserver(update: ObserverUpdate): ObserverLocation {
    this.observer = {
      latitude: update.latitude ?? this.observer.latitude,
      longitude: update.longitude ?? this.observer.longitude,
      altitudeMeters: update.altitudeMeters ?? this.observer.altitudeMeters,
    };

    if (update.radiusKm !== undefined) {
      this.radiusKm = update.radiusKm;
      this.config.flightData.radiusKm = update.radiusKm;
    }

    this.config.userLocation = { ...this.observer };
    this.current.clear();

    return this.getObserver();
  }

  getCurrent(): AircraftSnapshot[] {
    return [...this.current.values()].sort(
      (a, b) => a.distanceMeters - b.distanceMeters,
    );
  }

  async refresh(now = new Date()): Promise<AirspaceRefreshResult> {
    const radiusMeters = this.radiusKm * 1000;
    const bounds = boundingBoxForRadius(this.observer, radiusMeters);
    const fetched = await this.provider.fetchAircraft({
      observer: this.observer,
      radiusMeters,
      bounds,
      now,
    });
    const filtered = fetched
      .filter((aircraft) => this.isInsideRadius(aircraft, radiusMeters))
      .filter((aircraft) => this.isFresh(aircraft, now))
      .sort((a, b) => a.distanceMeters - b.distanceMeters)
      .slice(0, this.config.render.maxAircraft);
    const enriched = await this.metadataEnricher.enrich(filtered);
    const incoming = new Set(enriched.map((aircraft) => aircraft.icao));
    const removed = [...this.current.keys()].filter(
      (icao) => !incoming.has(icao),
    );

    this.current.clear();
    for (const aircraft of enriched) {
      this.current.set(aircraft.icao, aircraft);
    }

    return {
      aircraft: this.getCurrent(),
      removed,
    };
  }

  private isInsideRadius(
    aircraft: AircraftSnapshot,
    radiusMeters: number,
  ): boolean {
    const distance = haversineDistanceMeters(this.observer, aircraft);

    return distance <= radiusMeters;
  }

  private isFresh(aircraft: AircraftSnapshot, now: Date): boolean {
    const updatedAtMs = Date.parse(aircraft.updatedAt);

    return (
      Number.isFinite(updatedAtMs) &&
      now.getTime() - updatedAtMs <= this.config.flightData.staleAfterMs
    );
  }
}
