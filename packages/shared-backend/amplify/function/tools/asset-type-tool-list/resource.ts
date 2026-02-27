import { defineFunction } from "@aws-amplify/backend";

export const assetTypeToolList = defineFunction({
  name: "asset-type-tool-list",
  entry: "./handler.ts",
  resourceGroupName: "agentcore-tools",
});
