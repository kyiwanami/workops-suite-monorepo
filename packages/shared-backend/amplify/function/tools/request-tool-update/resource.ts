import { defineFunction } from "@aws-amplify/backend";

export const requestToolUpdate = defineFunction({
  name: "request-tool-update",
  entry: "./handler.ts",
  resourceGroupName: "agentcore-tools",
});
