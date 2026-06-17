import fs from "node:fs";
import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";

const outputsPath = path.resolve(__dirname, "../amplify_outputs.json");

// amplify_outputs.json is generated at the repo root (gitignored).
// In dev mode, serve it directly from there so local development always
// uses the latest deployed config without manual copying.
// In build mode, copy it into dist/ so the hosted SPA can fetch it at runtime.
// If the file doesn't exist, loadAmplifyConfig() falls back to the local MCP server.
function amplifyOutputs(): Plugin {
  return {
    name: "amplify-outputs",
    configureServer(server) {
      server.middlewares.use("/amplify_outputs.json", (_req, res, next) => {
        fs.readFile(outputsPath, (err, data) => {
          if (err) return next();
          res.setHeader("Content-Type", "application/json");
          res.end(data);
        });
      });
    },
    writeBundle() {
      if (fs.existsSync(outputsPath)) {
        fs.copyFileSync(
          outputsPath,
          path.resolve(__dirname, "dist/amplify_outputs.json"),
        );
      }
    },
  };
}

export default defineConfig({
  plugins: [react(), amplifyOutputs()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  envDir: "..",
  server: { port: 5173 },
  test: {
    environment: "node",
  },
});
