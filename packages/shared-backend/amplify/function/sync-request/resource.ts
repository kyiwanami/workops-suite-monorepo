import { defineFunction } from "@aws-amplify/backend";

export const syncRequest = defineFunction({
  name: "sync-request",
  entry: "./handler.ts",
  resourceGroupName: "data",
});
