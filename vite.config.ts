import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig, type Plugin } from "vitest/config";
import react from "@vitejs/plugin-react";

// Stamps the service worker with a hash of the built index.html. The HTML names
// every hashed asset, so any code change gives the worker a new cache name.
function serviceWorkerBuildId(): Plugin {
  let outDir = "dist";

  return {
    name: "service-worker-build-id",
    apply: "build",
    configResolved(config) {
      outDir = resolve(config.root, config.build.outDir);
    },
    closeBundle() {
      const html = readFileSync(resolve(outDir, "index.html"), "utf8");
      const buildId = createHash("sha256").update(html).digest("hex").slice(0, 12);
      const workerPath = resolve(outDir, "sw.js");
      const worker = readFileSync(workerPath, "utf8");

      if (!worker.includes("__BUILD_ID__")) {
        throw new Error("sw.js is missing the __BUILD_ID__ placeholder");
      }

      writeFileSync(workerPath, worker.replaceAll("__BUILD_ID__", buildId));
    }
  };
}

export default defineConfig({
  plugins: [react(), serviceWorkerBuildId()],
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"]
  }
});
