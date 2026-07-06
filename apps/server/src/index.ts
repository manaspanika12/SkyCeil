import { existsSync } from "node:fs";
import path from "node:path";
import { createSkyCeilRuntime } from "./createServer.js";
import { loadConfig, resolveProjectRoot } from "./config/loadConfig.js";

async function main(): Promise<void> {
  const config = await loadConfig();
  const root = resolveProjectRoot();
  const webDist = path.join(root, "apps/web/dist");
  const runtime = await createSkyCeilRuntime(
    existsSync(path.join(webDist, "index.html")) ? { staticDir: webDist } : {},
  );

  runtime.httpServer.listen(config.server.port, config.server.host, () => {
    console.log(
      `SkyCeil server listening on http://${config.server.host}:${config.server.port} with ${runtime.providerSource} provider`,
    );
  });

  const shutdown = () => {
    runtime.realtime.stop();
    runtime.httpServer.close(() => process.exit(0));
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
