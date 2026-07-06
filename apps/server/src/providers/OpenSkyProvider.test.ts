import { describe, expect, it } from "vitest";
import { normalizeOpenSkyStateVector } from "./OpenSkyProvider.js";

describe("OpenSky normalization", () => {
  it("maps a state vector into a SkyCeil aircraft snapshot", () => {
    const snapshot = normalizeOpenSkyStateVector(
      [
        "abc123",
        "UAL42   ",
        "United States",
        1780000000,
        1780000001,
        -122.2,
        37.8,
        9000,
        false,
        220,
        95,
        0.5,
        null,
        9200,
        null,
        false,
        0,
        3,
      ],
      { latitude: 37.7749, longitude: -122.4194, altitudeMeters: 15 },
      new Date("2026-06-29T00:00:00.000Z"),
    );

    expect(snapshot?.icao).toBe("abc123");
    expect(snapshot?.flightNumber).toBe("UAL42");
    expect(snapshot?.altitudeMeters).toBe(9200);
    expect(snapshot?.source).toBe("opensky");
  });

  it("drops state vectors without coordinates", () => {
    const snapshot = normalizeOpenSkyStateVector(
      [
        "abc123",
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        false,
        null,
        null,
        null,
        null,
        null,
        null,
        false,
        0,
        null,
      ],
      { latitude: 0, longitude: 0, altitudeMeters: 0 },
      new Date(),
    );

    expect(snapshot).toBeUndefined();
  });
});
