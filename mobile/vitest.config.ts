import { defineConfig } from "vitest/config";

// Vitest runs the app's pure-logic unit tests (utils with no React Native
// imports). Component/integration tests would need jest-expo's native preset;
// these fast, dependency-free tests guard the business logic in CI.
export default defineConfig({
  test: {
    include: ["src/**/__tests__/**/*.test.ts"],
    environment: "node",
  },
});
