import { defineFunction } from "@aws-amplify/backend";

export const assetToolUpdate = defineFunction({
  name: "asset-tool-update",
  entry: "./handler.ts",
  resourceGroupName: "agentcore-tools",
});
