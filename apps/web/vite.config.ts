import react from "@vitejs/plugin-react";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "../..");

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@skyceil/shared": path.join(root, "packages/shared/src/index.ts"),
      "@skyceil/geo": path.join(root, "packages/geo/src/index.ts"),
      "@skyceil/renderer-core": path.join(
        root,
        "packages/renderer-core/src/index.ts",
      ),
    },
  },
  server: {
    port: 5173,
    strictPort: false,
    proxy: {
      "/api": "http://localhost:4100",
      "/health": "http://localhost:4100",
      "/socket.io": {
        target: "http://localhost:4100",
        ws: true,
      },
    },
  },
  preview: {
    port: 4173,
    strictPort: false,
  },
});
