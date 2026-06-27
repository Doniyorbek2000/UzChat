import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    root: ".",
    include: ["src/__tests__/**/*.test.ts"],
    environment: "node",
    testTimeout: 15000,
    env: { NODE_ENV: "test" },
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      exclude: ["src/__tests__/**", "src/index.ts"],
    },
  },
});
