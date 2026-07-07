import { tmpdir } from "node:os";
import path from "node:path";
import { createSkyCeilRuntime } from "../apps/server/src/createServer.js";

process.env.SKYCEIL_PROVIDER ??= "mock";
process.env.SKYCEIL_CORS_ORIGIN ??= "*";

const runtime = await createSkyCeilRuntime({
  apiBasePath: "/api/server",
  dataDir: path.join(tmpdir(), "skyceil"),
  socketPath: "/api/socket.io",
});

export default runtime.httpServer;
