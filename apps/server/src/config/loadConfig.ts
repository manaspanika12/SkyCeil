import { appConfigSchema, type AppConfig } from "@skyceil/shared";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function resolveProjectRoot(): string {
  return process.env.SKYCEIL_ROOT ?? path.resolve(__dirname, "../../../..");
}

export async function loadConfig(): Promise<AppConfig> {
  const root = resolveProjectRoot();
  const configPath =
    process.env.SKYCEIL_CONFIG_PATH ?? path.join(root, "config/default.json");
  const raw = JSON.parse(await readFile(configPath, "utf8")) as AppConfig;
  const candidate = structuredClone(raw);
  applyEnvironmentOverrides(candidate);

  return appConfigSchema.parse(candidate);
}

function applyEnvironmentOverrides(config: AppConfig): void {
  const env = process.env;

  if (env.SKYCEIL_HOST) {
    config.server.host = env.SKYCEIL_HOST;
  }
  if (env.SKYCEIL_PORT) {
    config.server.port = Number(env.SKYCEIL_PORT);
  }
  if (env.SKYCEIL_CORS_ORIGIN) {
    config.server.corsOrigin = env.SKYCEIL_CORS_ORIGIN;
  }
  if (env.SKYCEIL_USER_LAT) {
    config.userLocation.latitude = Number(env.SKYCEIL_USER_LAT);
  }
  if (env.SKYCEIL_USER_LON) {
    config.userLocation.longitude = Number(env.SKYCEIL_USER_LON);
  }
  if (env.SKYCEIL_USER_ALTITUDE_METERS) {
    config.userLocation.altitudeMeters = Number(
      env.SKYCEIL_USER_ALTITUDE_METERS,
    );
  }
  if (env.SKYCEIL_RADIUS_KM) {
    config.flightData.radiusKm = Number(env.SKYCEIL_RADIUS_KM);
  }
  if (env.SKYCEIL_POLL_INTERVAL_MS) {
    config.flightData.pollIntervalMs = Number(env.SKYCEIL_POLL_INTERVAL_MS);
  }
  if (env.SKYCEIL_PROVIDER) {
    config.flightData.provider =
      env.SKYCEIL_PROVIDER as AppConfig["flightData"]["provider"];
  }
  if (env.OPENSKY_BASE_URL) {
    config.flightData.openSky.baseUrl = env.OPENSKY_BASE_URL;
  }
  if (env.OPENSKY_AUTH_URL) {
    config.flightData.openSky.authUrl = env.OPENSKY_AUTH_URL;
  }
  if (env.OPENSKY_CLIENT_ID !== undefined) {
    config.flightData.openSky.clientId = env.OPENSKY_CLIENT_ID;
  }
  if (env.OPENSKY_CLIENT_SECRET !== undefined) {
    config.flightData.openSky.clientSecret = env.OPENSKY_CLIENT_SECRET;
  }
}
