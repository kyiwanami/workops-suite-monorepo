import { defineFunction } from "@aws-amplify/backend";

export const syncAsset = defineFunction({
  name: "sync-asset",
  entry: "./handler.ts",
  resourceGroupName: "data",
});
