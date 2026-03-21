import { defineFunction } from "@aws-amplify/backend";

export const assetTypeToolCreate = defineFunction({
  name: "asset-type-tool-create",
  entry: "./handler.ts",
  resourceGroupName: "agentcore-tools",
  logging: { retention: "3 months" },
});
