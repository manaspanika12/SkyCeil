import { describe, expect, it } from "vitest";
import {
  applyHomography,
  mapSkyToCeiling,
  solveHomography,
} from "./projection.js";

describe("projection mapping", () => {
  it("places zenith at the center", () => {
    const point = mapSkyToCeiling({
      azimuthDegrees: 0,
      elevationDegrees: 90,
      minElevationDegrees: 0,
    });

    expect(point.x).toBeCloseTo(0.5, 3);
    expect(point.y).toBeCloseTo(0.5, 3);
  });

  it("maps north toward the top before room offset", () => {
    const point = mapSkyToCeiling({
      azimuthDegrees: 0,
      elevationDegrees: 0,
      minElevationDegrees: 0,
    });

    expect(point.y).toBeLessThan(0.1);
  });

  it("solves a square-to-keystone homography", () => {
    const matrix = solveHomography(
      [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 1, y: 1 },
        { x: 0, y: 1 },
      ],
      [
        { x: 0.1, y: 0.05 },
        { x: 0.92, y: 0.08 },
        { x: 0.88, y: 0.91 },
        { x: 0.08, y: 0.95 },
      ],
    );

    expect(applyHomography({ x: 0, y: 0 }, matrix).x).toBeCloseTo(0.1, 4);
    expect(applyHomography({ x: 1, y: 1 }, matrix).y).toBeCloseTo(0.91, 4);
  });
});
