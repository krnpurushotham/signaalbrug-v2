import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// GitHub Pages serves the app from /signaalbrug-v2/ (hash router avoids 404s).
export default defineConfig(({ command }) => ({
  plugins: [react()],
  base: command === "build" ? "/signaalbrug-v2/" : "/",
  server: { port: 3000 },
}));
