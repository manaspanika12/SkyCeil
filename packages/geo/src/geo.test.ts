import { describe, expect, it } from "vitest";
import {
  boundingBoxForRadius,
  curvatureDropMeters,
  elevationAngleDegrees,
  haversineDistanceMeters,
  initialBearingDegrees,
} from "./geo.js";

describe("geospatial math", () => {
  it("computes known approximate city distance", () => {
    const sf = { latitude: 37.7749, longitude: -122.4194 };
    const oakland = { latitude: 37.8044, longitude: -122.2712 };

    expect(haversineDistanceMeters(sf, oakland)).toBeGreaterThan(13000);
    expect(haversineDistanceMeters(sf, oakland)).toBeLessThan(15000);
  });

  it("computes cardinal bearings", () => {
    expect(
      initialBearingDegrees(
        { latitude: 0, longitude: 0 },
        { latitude: 1, longitude: 0 },
      ),
    ).toBeCloseTo(0, 3);
    expect(
      initialBearingDegrees(
        { latitude: 0, longitude: 0 },
        { latitude: 0, longitude: 1 },
      ),
    ).toBeCloseTo(90, 3);
  });

  it("applies Earth curvature to elevation", () => {
    const flatElevation = elevationAngleDegrees({
      targetAltitudeMeters: 10_000,
      groundDistanceMeters: 200_000,
      applyCurvature: false,
    });
    const curvedElevation = elevationAngleDegrees({
      targetAltitudeMeters: 10_000,
      groundDistanceMeters: 200_000,
    });

    expect(curvatureDropMeters(200_000)).toBeGreaterThan(3000);
    expect(curvedElevation).toBeLessThan(flatElevation);
  });

  it("derives a radius bounding box", () => {
    const box = boundingBoxForRadius(
      { latitude: 37.7749, longitude: -122.4194 },
      200_000,
    );

    expect(box.minLatitude).toBeLessThan(37.7749);
    expect(box.maxLatitude).toBeGreaterThan(37.7749);
    expect(box.minLongitude).toBeLessThan(-122.4194);
    expect(box.maxLongitude).toBeGreaterThan(-122.4194);
  });
});
