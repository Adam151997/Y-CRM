import { defineConfig } from "vitest/config";
import { resolve } from "path";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    include: ["**/*.test.ts"],
    exclude: ["node_modules", ".next"],
    testTimeout: 30000,
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "./"),
    },
  },
});
