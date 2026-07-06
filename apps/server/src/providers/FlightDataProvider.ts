import type { GeoBoundingBox } from "@skyceil/geo";
import type {
  AircraftSnapshot,
  AircraftSource,
  ObserverLocation,
} from "@skyceil/shared";

export type FetchAircraftInput = {
  observer: ObserverLocation;
  radiusMeters: number;
  bounds: GeoBoundingBox;
  now: Date;
};

export interface FlightDataProvider {
  readonly source: AircraftSource;
  fetchAircraft(input: FetchAircraftInput): Promise<AircraftSnapshot[]>;
}
