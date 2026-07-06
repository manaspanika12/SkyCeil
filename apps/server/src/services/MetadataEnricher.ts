import type { AircraftSnapshot } from "@skyceil/shared";

export interface MetadataEnricher {
  enrich(aircraft: AircraftSnapshot[]): Promise<AircraftSnapshot[]>;
}

export class PassthroughMetadataEnricher implements MetadataEnricher {
  async enrich(aircraft: AircraftSnapshot[]): Promise<AircraftSnapshot[]> {
    return aircraft;
  }
}
