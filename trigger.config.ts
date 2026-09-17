import { existsSync } from "node:fs";
import { loadEnvFile } from "node:process";

import { defineConfig } from "@trigger.dev/sdk";
import { playwright } from "@trigger.dev/build/extensions/playwright";

// The Trigger.dev CLI loads env files for its own resolution, but does not
// populate `process.env` before evaluating trigger.config.ts.  Next.js
// auto-loads .env.local for us at runtime, but the Trigger.dev dev/deploy
// commands never do.  Load it here so `project` can be resolved the same way
// in all entry points.  Existing env vars (e.g. set in a shell or CI) are
// never overridden — `process.loadEnvFile` only fills missing keys.
if (existsSync(".env.local")) {
  loadEnvFile(".env.local");
}

const projectRef = process.env.TRIGGER_PROJECT_REF;

if (!projectRef) {
  throw new Error(
    "TRIGGER_PROJECT_REF is not set. Create a Trigger.dev project and set TRIGGER_PROJECT_REF in .env.local (or export it in your shell) before running the Trigger.dev CLI.",
  );
}

export default defineConfig({
  project: projectRef,
  dirs: ["./trigger"],
  retries: {
    enabledInDev: false,
  },
  maxDuration: 60,
  build: {
    extensions: [playwright()],
    external: ["playwright"],
  },
});
