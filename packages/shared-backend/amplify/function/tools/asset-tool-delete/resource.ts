import { defineFunction } from "@aws-amplify/backend";

export const assetToolDelete = defineFunction({
  name: "asset-tool-delete",
  entry: "./handler.ts",
  resourceGroupName: "agentcore-tools",
});
