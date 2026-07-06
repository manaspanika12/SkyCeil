import {
  calibrationSolveRequestSchema,
  calibrationStateSchema,
  displayModeSchema,
  toPublicConfig,
  type AppConfig,
} from "@skyceil/shared";
import cors from "cors";
import express, { type Express } from "express";
import path from "node:path";
import { z } from "zod";
import type { AirspaceService } from "./services/AirspaceService.js";
import type { CalibrationService } from "./services/CalibrationService.js";
import type { RealtimeService } from "./services/RealtimeService.js";

const locationUpdateSchema = z.object({
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  altitudeMeters: z.coerce.number().min(-500).max(9000).optional(),
  radiusKm: z.coerce.number().min(1).max(800).optional(),
});

export type AppServices = {
  config: AppConfig;
  airspace: AirspaceService;
  calibration: CalibrationService;
  apiBasePath?: string;
  realtime?: RealtimeService;
  staticDir?: string;
};

export function createApp(services: AppServices): Express {
  const app = express();

  if (services.apiBasePath) {
    app.use((request, _response, next) => {
      const basePath = services.apiBasePath as string;
      if (request.url === basePath) {
        request.url = "/";
      } else if (request.url.startsWith(`${basePath}/`)) {
        request.url = request.url.slice(basePath.length);
      }
      next();
    });
  }

  app.use(express.json({ limit: "1mb" }));
  app.use(
    cors({
      origin:
        services.config.server.corsOrigin === "*"
          ? true
          : services.config.server.corsOrigin,
    }),
  );

  app.get("/health", (_request, response) => {
    response.json({
      ok: true,
      aircraftCount: services.airspace.getCurrent().length,
      status: services.realtime?.getStatus(),
    });
  });

  app.get("/api/config/public", (_request, response) => {
    response.json(toPublicConfig(services.config));
  });

  app.get("/api/aircraft/current", (_request, response) => {
    response.json(services.airspace.getCurrent());
  });

  app.put("/api/location", async (request, response, next) => {
    try {
      const location = locationUpdateSchema.parse(request.body);
      services.airspace.updateObserver(location);
      await services.realtime?.pollOnce();
      response.json(toPublicConfig(services.config));
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/calibration", (_request, response) => {
    response.json(services.calibration.get());
  });

  app.put("/api/calibration", async (request, response, next) => {
    try {
      const calibration = calibrationStateSchema.parse(request.body);
      const updated = await services.calibration.update(calibration);
      services.realtime?.emitCalibrationUpdated(updated);
      response.json(updated);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/calibration/solve", async (request, response, next) => {
    try {
      const solveRequest = calibrationSolveRequestSchema.parse(request.body);
      const calibration = await services.calibration.solve(solveRequest);
      services.realtime?.emitCalibrationUpdated(calibration);
      response.json(calibration);
    } catch (error) {
      next(error);
    }
  });

  app.put("/api/display-mode", (request, response, next) => {
    try {
      const mode = displayModeSchema.parse(request.body?.mode);
      const status = services.realtime?.setMode(mode);
      response.json(status ?? { mode });
    } catch (error) {
      next(error);
    }
  });

  if (services.staticDir) {
    app.use(express.static(services.staticDir));
    app.get("*", (_request, response) => {
      response.sendFile(path.join(services.staticDir as string, "index.html"));
    });
  }

  app.use(
    (
      error: unknown,
      _request: express.Request,
      response: express.Response,
      _next: express.NextFunction,
    ) => {
      const status =
        typeof error === "object" && error !== null && "status" in error
          ? Number((error as { status: unknown }).status)
          : 400;
      response.status(Number.isFinite(status) ? status : 400).json({
        error: error instanceof Error ? error.message : "Request failed",
      });
    },
  );

  return app;
}
