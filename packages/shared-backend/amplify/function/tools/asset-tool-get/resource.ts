import { defineFunction } from "@aws-amplify/backend";

export const assetToolGet = defineFunction({
  name: "asset-tool-get",
  entry: "./handler.ts",
  resourceGroupName: "agentcore-tools",
});
