import { resolve } from "path";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@workops-suite/shared-auth": resolve(
        __dirname,
        "../../packages/shared-auth/src/index.ts"
      ),
      "@workops-suite/shared-department": resolve(
        __dirname,
        "../../packages/shared-department/src/index.ts"
      ),
      "@workops-suite/shared-navigation": resolve(
        __dirname,
        "../../packages/shared-navigation/src/index.ts"
      ),
      "@workops-suite/shared-notification": resolve(
        __dirname,
        "../../packages/shared-notification/src/index.ts"
      ),
      "@workops/data-schema": resolve(
        __dirname,
        "../../packages/shared-backend/amplify/data/resource"
      ),
    },
  },
  // node テストと React テストを分離して、環境差分を明示する。
  test: {
    projects: [
      {
        test: {
          name: "logic",
          environment: "node",
          include: ["src/**/*.spec.ts"],
        },
      },
      {
        test: {
          name: "react",
          environment: "jsdom",
          setupFiles: ["./src/test/setup.ts"],
          include: ["src/**/*.spec.tsx"],
        },
      },
    ],
  },
});
