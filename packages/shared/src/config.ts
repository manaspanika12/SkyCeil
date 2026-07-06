import { z } from "zod";

export const displayModeSchema = z.enum(["radar", "cinematic", "immersive"]);
export const aircraftSourceSchema = z.enum([
  "opensky",
  "adsb",
  "local",
  "mock",
]);

export const appConfigSchema = z.object({
  server: z.object({
    host: z.string().min(1),
    port: z.coerce.number().int().min(1).max(65535),
    corsOrigin: z.string().min(1),
  }),
  userLocation: z.object({
    latitude: z.coerce.number().min(-90).max(90),
    longitude: z.coerce.number().min(-180).max(180),
    altitudeMeters: z.coerce.number().default(0),
  }),
  flightData: z.object({
    provider: aircraftSourceSchema,
    radiusKm: z.coerce.number().min(1).max(800),
    pollIntervalMs: z.coerce.number().int().min(2000).max(30000),
    staleAfterMs: z.coerce.number().int().min(5000).max(300000),
    openSky: z.object({
      baseUrl: z.string().url(),
      authUrl: z.string().url(),
      clientId: z.string().optional().default(""),
      clientSecret: z.string().optional().default(""),
    }),
  }),
  room: z.object({
    widthMeters: z.coerce.number().positive(),
    lengthMeters: z.coerce.number().positive(),
    ceilingHeightMeters: z.coerce.number().positive(),
    northOffsetDegrees: z.coerce.number().min(-360).max(360),
  }),
  projector: z.object({
    widthPixels: z.coerce.number().int().positive(),
    heightPixels: z.coerce.number().int().positive(),
    throwOffsetX: z.coerce.number().default(0),
    throwOffsetY: z.coerce.number().default(0),
  }),
  render: z.object({
    defaultMode: displayModeSchema,
    minElevationDegrees: z.coerce.number().min(-10).max(45),
    maxTrailSeconds: z.coerce.number().min(5).max(600),
    maxAircraft: z.coerce.number().int().min(1).max(1000),
    targetFps: z.coerce.number().int().min(24).max(144),
  }),
});

export type AppConfig = z.infer<typeof appConfigSchema>;

export const calibrationPointSchema = z.object({
  x: z.coerce.number(),
  y: z.coerce.number(),
});

export const homographyMatrixSchema = z
  .array(z.coerce.number())
  .length(9)
  .transform(
    (values) =>
      values as [
        number,
        number,
        number,
        number,
        number,
        number,
        number,
        number,
        number,
      ],
  );

export const calibrationStateSchema = z.object({
  roomWidthMeters: z.coerce.number().positive(),
  roomLengthMeters: z.coerce.number().positive(),
  projectorWidthPixels: z.coerce.number().int().positive(),
  projectorHeightPixels: z.coerce.number().int().positive(),
  northOffsetDegrees: z.coerce.number().min(-360).max(360),
  homography: homographyMatrixSchema,
  updatedAt: z.string().datetime(),
});

export const calibrationSolveRequestSchema = z.object({
  sourcePoints: z.tuple([
    calibrationPointSchema,
    calibrationPointSchema,
    calibrationPointSchema,
    calibrationPointSchema,
  ]),
  targetPoints: z.tuple([
    calibrationPointSchema,
    calibrationPointSchema,
    calibrationPointSchema,
    calibrationPointSchema,
  ]),
});

export function toPublicConfig(config: AppConfig) {
  return {
    userLocation: config.userLocation,
    flightData: {
      provider: config.flightData.provider,
      radiusKm: config.flightData.radiusKm,
      pollIntervalMs: config.flightData.pollIntervalMs,
      staleAfterMs: config.flightData.staleAfterMs,
    },
    room: {
      widthMeters: config.room.widthMeters,
      lengthMeters: config.room.lengthMeters,
      ceilingHeightMeters: config.room.ceilingHeightMeters,
      northOffsetDegrees: config.room.northOffsetDegrees,
    },
    projector: {
      widthPixels: config.projector.widthPixels,
      heightPixels: config.projector.heightPixels,
    },
    render: config.render,
  };
}
