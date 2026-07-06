import "dotenv/config";
import {
  type ClientToServerEvents,
  type ServerToClientEvents,
} from "@skyceil/shared";
import { createServer } from "node:http";
import { existsSync } from "node:fs";
import path from "node:path";
import { Server } from "socket.io";
import { createApp, type AppServices } from "./app.js";
import { loadConfig, resolveProjectRoot } from "./config/loadConfig.js";
import { createFlightDataProvider } from "./providers/createProvider.js";
import { AirspaceService } from "./services/AirspaceService.js";
import { CalibrationService } from "./services/CalibrationService.js";
import { PassthroughMetadataEnricher } from "./services/MetadataEnricher.js";
import { RealtimeService } from "./services/RealtimeService.js";

async function main(): Promise<void> {
  const config = await loadConfig();
  const root = resolveProjectRoot();
  const calibration = new CalibrationService(path.join(root, "data"), config);
  await calibration.load();

  const provider = createFlightDataProvider(config);
  const airspace = new AirspaceService(
    config,
    provider,
    new PassthroughMetadataEnricher(),
  );
  const webDist = path.join(root, "apps/web/dist");
  const services: AppServices = { config, airspace, calibration };
  if (existsSync(path.join(webDist, "index.html"))) {
    services.staticDir = webDist;
  }
  const app = createApp(services);
  const httpServer = createServer(app);
  const io = new Server<ClientToServerEvents, ServerToClientEvents>(
    httpServer,
    {
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
  realtime.start();

  httpServer.listen(config.server.port, config.server.host, () => {
    console.log(
      `SkyCeil server listening on http://${config.server.host}:${config.server.port} with ${provider.source} provider`,
    );
  });

  const shutdown = () => {
    realtime.stop();
    io.close();
    httpServer.close(() => process.exit(0));
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
