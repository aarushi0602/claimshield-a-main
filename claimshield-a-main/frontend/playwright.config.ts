import { defineConfig } from "@playwright/test";

// End-to-end tests drive the real FastAPI app (demo auth, local fallbacks) serving the built UI.
// Build first (`npm run build`). Uses the locally installed Chrome; set PW_CHANNEL to change it.
// SCREENSHOTS=1 also saves full-page screenshots of each screen to ../demo-kit/screens/.
const port = Number(process.env.E2E_PORT ?? 8092);
const python = process.env.CLAIMSHIELD_PYTHON ?? ".venv/bin/python";

export default defineConfig({
  testDir: "./e2e",
  timeout: 120_000,
  expect: { timeout: 60_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: `http://localhost:${port}`,
    channel: process.env.PW_CHANNEL ?? "chrome",
    viewport: { width: 1440, height: 900 },
    screenshot: "only-on-failure",
    video: process.env.E2E_VIDEO ? "on" : "off",
  },
  webServer: {
    command: `cd .. && ${python} -m uvicorn claimshield.api.main:app --host 127.0.0.1 --port ${port}`,
    url: `http://localhost:${port}/api/health`,
    reuseExistingServer: false,
    timeout: 120_000,
    env: { CLAIMSHIELD_AUTH_MODE: "demo", CLAIMSHIELD_DEMO_PACE: "0.05", CLAIMSHIELD_USE_GEMINI: "false" },
  },
});
