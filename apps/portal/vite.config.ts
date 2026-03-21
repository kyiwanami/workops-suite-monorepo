import { resolve } from "path";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@workops/data-schema": resolve(
        __dirname,
        "../../packages/shared-backend/amplify/data/resource"
      ),
    },
  },
  // Zod schema の最小テストを node 環境で回す。
  test: {
    environment: "node",
    include: ["src/**/*.spec.ts"],
  },
});
