import { defineConfig } from "vitest/config";
import path from "node:path";

// Runs the Firestore rules tests in test/rules against the local Firestore emulator. Use
// `npm run test:rules`, which starts the emulator (needs Java) and stops it afterwards.
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
  test: {
    environment: "node",
    include: ["test/rules/**/*.test.ts"],
    testTimeout: 30000,
    hookTimeout: 30000,
    fileParallelism: false,
  },
});
