import { destinationPoint, geodeticToSky } from "@skyceil/geo";
import type { AircraftSnapshot } from "@skyceil/shared";
import type {
  FetchAircraftInput,
  FlightDataProvider,
} from "./FlightDataProvider.js";

export class MockFlightProvider implements FlightDataProvider {
  readonly source = "mock" as const;

  async fetchAircraft(input: FetchAircraftInput): Promise<AircraftSnapshot[]> {
    const seconds = input.now.getTime() / 1000;
    const aircraft: AircraftSnapshot[] = [];

    for (let index = 0; index < 16; index += 1) {
      const orbit = (seconds * (0.8 + index * 0.03) + index * 53) % 360;
      const distanceMeters = 20_000 + index * 10_500;
      const headingDegrees = (orbit + 70 + index * 17) % 360;
      const point = destinationPoint(input.observer, distanceMeters, orbit);
      const altitudeMeters = 3000 + (index % 7) * 850;
      const sky = geodeticToSky(input.observer, {
        ...point,
        altitudeMeters,
      });

      aircraft.push({
        icao: `mock${index.toString().padStart(3, "0")}`,
        flightNumber: `SKY${(700 + index).toString()}`,
        airline: "SkyCeil Synthetic",
        origin: "LOCAL",
        destination: "CEILING",
        latitude: point.latitude,
        longitude: point.longitude,
        altitudeMeters,
        speedMetersPerSecond: 170 + index * 4,
        headingDegrees,
        verticalRateMetersPerSecond: Math.sin(seconds / 12 + index) * 3,
        azimuthDegrees: sky.azimuthDegrees,
        elevationDegrees: sky.elevationDegrees,
        distanceMeters: sky.distanceMeters,
        updatedAt: input.now.toISOString(),
        source: "mock",
      });
    }

    return aircraft;
  }
}
