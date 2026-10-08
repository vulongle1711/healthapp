import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: { environment: "node", include: ["tests/**/*.test.ts"] },
  resolve: { alias: { "server-only": path.resolve(__dirname, "tests/stubs/empty.ts"), "@": path.resolve(__dirname, ".") } },
});
