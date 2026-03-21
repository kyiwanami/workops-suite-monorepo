import { defineFunction } from "@aws-amplify/backend";

export const assetToolCreate = defineFunction({
  name: "asset-tool-create",
  entry: "./handler.ts",
  resourceGroupName: "agentcore-tools",
  logging: { retention: "3 months" },
});
