import "dotenv/config";
import {
  type ClientToServerEvents,
  type ServerToClientEvents,
} from "@skyceil/shared";
import { existsSync } from "node:fs";
import { createServer, type Server as HttpServer } from "node:http";
import path from "node:path";
import { Server } from "socket.io";
import { createApp, type AppServices } from "./app.js";
import { loadConfig, resolveProjectRoot } from "./config/loadConfig.js";
import { createFlightDataProvider } from "./providers/createProvider.js";
import { AirspaceService } from "./services/AirspaceService.js";
import { CalibrationService } from "./services/CalibrationService.js";
import { PassthroughMetadataEnricher } from "./services/MetadataEnricher.js";
import { RealtimeService } from "./services/RealtimeService.js";

type CreateSkyCeilRuntimeOptions = {
  apiBasePath?: string;
  dataDir?: string;
  socketPath?: string;
  staticDir?: string;
  startRealtime?: boolean;
};

export type SkyCeilRuntime = {
  app: ReturnType<typeof createApp>;
  httpServer: HttpServer;
  realtime: RealtimeService;
  providerSource: string;
  stop: () => void;
};

export async function createSkyCeilRuntime(
  options: CreateSkyCeilRuntimeOptions = {},
): Promise<SkyCeilRuntime> {
  const config = await loadConfig();
  const root = resolveProjectRoot();
  const dataDir = options.dataDir ?? path.join(root, "data");
  const calibration = new CalibrationService(dataDir, config);
  await calibration.load();

  const provider = createFlightDataProvider(config);
  const airspace = new AirspaceService(
    config,
    provider,
    new PassthroughMetadataEnricher(),
  );
  const services: AppServices = {
    config,
    airspace,
    calibration,
  };
  if (options.apiBasePath) {
    services.apiBasePath = options.apiBasePath;
  }

  if (
    options.staticDir &&
    existsSync(path.join(options.staticDir, "index.html"))
  ) {
    services.staticDir = options.staticDir;
  }

  const app = createApp(services);
  const httpServer = createServer(app);
  const io = new Server<ClientToServerEvents, ServerToClientEvents>(
    httpServer,
    {
      path: options.socketPath ?? "/socket.io",
      cors: {
        origin:
          config.server.corsOrigin === "*" ? true : config.server.corsOrigin,
      },
    },
  );
  const realtime = new RealtimeService(
    io,
    airspace,
    config.flightData.pollIntervalMs,
    config.render.defaultMode,
  );

  services.realtime = realtime;
  realtime.registerSocketHandlers(calibration);
  if (options.startRealtime ?? true) {
    realtime.start();
  }

  return {
    app,
    httpServer,
    realtime,
    providerSource: provider.source,
    stop: () => {
      realtime.stop();
      io.close();
      httpServer.close();
    },
  };
}
