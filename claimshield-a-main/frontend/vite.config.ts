/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// The FastAPI backend (make run, port 8080 by default) serves the built app from ../web.
// In `npm run dev`, Vite proxies /api to it. The backend rejects state-changing requests
// whose Origin is not its own, so the proxy presents the backend's origin.
const backend = process.env.CLAIMSHIELD_API ?? "http://localhost:8080";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: { outDir: "../web", emptyOutDir: true, sourcemap: false },
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: backend,
        changeOrigin: true,
        headers: { origin: backend },
      },
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    include: ["src/**/*.test.{ts,tsx}"],
    setupFiles: ["./src/test/setup.ts"],
    css: false,
  },
});
