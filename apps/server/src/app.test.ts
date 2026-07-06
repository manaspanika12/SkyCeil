import { appConfigSchema, type AppConfig } from "@skyceil/shared";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "./app.js";
import { MockFlightProvider } from "./providers/MockFlightProvider.js";
import { AirspaceService } from "./services/AirspaceService.js";
import { CalibrationService } from "./services/CalibrationService.js";
import { PassthroughMetadataEnricher } from "./services/MetadataEnricher.js";

function testConfig(): AppConfig {
  return appConfigSchema.parse({
    server: { host: "127.0.0.1", port: 4100, corsOrigin: "*" },
    userLocation: {
      latitude: 37.7749,
      longitude: -122.4194,
      altitudeMeters: 15,
    },
    flightData: {
      provider: "mock",
      radiusKm: 200,
      pollIntervalMs: 5000,
      staleAfterMs: 30000,
      openSky: {
        baseUrl: "https://opensky-network.org/api",
        authUrl:
          "https://auth.opensky-network.org/auth/realms/opensky-network/protocol/openid-connect/token",
        clientId: "",
        clientSecret: "",
      },
    },
    room: {
      widthMeters: 4.2,
      lengthMeters: 3.8,
      ceilingHeightMeters: 2.8,
      northOffsetDegrees: 0,
    },
    projector: {
      widthPixels: 1920,
      heightPixels: 1080,
      throwOffsetX: 0,
      throwOffsetY: 0,
    },
    render: {
      defaultMode: "immersive",
      minElevationDegrees: 3,
      maxTrailSeconds: 90,
      maxAircraft: 300,
      targetFps: 60,
    },
  });
}

async function testApp() {
  const config = testConfig();
  const provider = new MockFlightProvider();
  const airspace = new AirspaceService(
    config,
    provider,
    new PassthroughMetadataEnricher(),
  );
  await airspace.refresh(new Date("2026-06-29T00:00:00.000Z"));
  const calibration = new CalibrationService(
    await mkdtemp(path.join(tmpdir(), "skyceil-")),
    config,
  );
  await calibration.load();

  return createApp({ config, airspace, calibration });
}

describe("SkyCeil API", () => {
  it("reports health", async () => {
    const app = await testApp();
    const response = await request(app).get("/health").expect(200);

    expect(response.body.ok).toBe(true);
    expect(response.body.aircraftCount).toBeGreaterThan(0);
  });

  it("returns current aircraft", async () => {
    const app = await testApp();
    const response = await request(app)
      .get("/api/aircraft/current")
      .expect(200);

    expect(response.body[0].icao).toMatch(/^mock/);
    expect(response.body[0].azimuthDegrees).toBeGreaterThanOrEqual(0);
  });

  it("solves and stores calibration", async () => {
    const app = await testApp();
    const response = await request(app)
      .post("/api/calibration/solve")
      .send({
        sourcePoints: [
          { x: 0, y: 0 },
          { x: 1, y: 0 },
          { x: 1, y: 1 },
          { x: 0, y: 1 },
        ],
        targetPoints: [
          { x: 0.1, y: 0.05 },
          { x: 0.92, y: 0.08 },
          { x: 0.88, y: 0.91 },
          { x: 0.08, y: 0.95 },
        ],
      })
      .expect(200);

    expect(response.body.homography).toHaveLength(9);
  });
  it("updates observer location", async () => {
    const app = await testApp();
    const response = await request(app)
      .put("/api/location")
      .send({
        latitude: 40.7128,
        longitude: -74.006,
        altitudeMeters: 10,
        radiusKm: 150,
      })
      .expect(200);

    expect(response.body.userLocation.latitude).toBeCloseTo(40.7128, 4);
    expect(response.body.userLocation.longitude).toBeCloseTo(-74.006, 4);
    expect(response.body.flightData.radiusKm).toBe(150);
  });
});
