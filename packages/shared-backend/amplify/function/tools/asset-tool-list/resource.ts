import { defineFunction } from "@aws-amplify/backend";

export const assetToolList = defineFunction({
  name: "asset-tool-list",
  entry: "./handler.ts",
  resourceGroupName: "agentcore-tools",
  logging: { retention: "3 months" },
});
