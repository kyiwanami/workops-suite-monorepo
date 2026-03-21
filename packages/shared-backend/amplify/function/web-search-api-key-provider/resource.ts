import { defineFunction } from "@aws-amplify/backend";

// Web 検索 API キー provider を作成する custom resource 用の関数
export const webSearchApiKeyProviderFunction = defineFunction({
  name: "web-search-api-key-provider",
  entry: "./handler.ts",
  timeoutSeconds: 300,
  logging: { retention: "3 months" },
});
