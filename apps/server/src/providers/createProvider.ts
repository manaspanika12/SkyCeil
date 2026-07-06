import type { AppConfig } from "@skyceil/shared";
import type { FlightDataProvider } from "./FlightDataProvider.js";
import { MockFlightProvider } from "./MockFlightProvider.js";
import { OpenSkyProvider } from "./OpenSkyProvider.js";

export function createFlightDataProvider(
  config: AppConfig,
): FlightDataProvider {
  if (config.flightData.provider === "mock") {
    return new MockFlightProvider();
  }

  if (config.flightData.provider === "opensky") {
    return new OpenSkyProvider({
      baseUrl: config.flightData.openSky.baseUrl,
      authUrl: config.flightData.openSky.authUrl,
      clientId: config.flightData.openSky.clientId,
      clientSecret: config.flightData.openSky.clientSecret,
    });
  }

  throw new Error(
    `Provider "${config.flightData.provider}" is reserved for future modules but is not implemented in this MVP.`,
  );
}
