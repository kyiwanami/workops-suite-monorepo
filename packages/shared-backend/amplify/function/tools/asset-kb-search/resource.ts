import { defineFunction } from "@aws-amplify/backend";

export const assetKbSearch = defineFunction({
  name: "asset-kb-search",
  entry: "./handler.ts",
  resourceGroupName: "agentcore-tools",
  logging: { retention: "3 months" },
});
