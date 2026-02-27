import { defineFunction } from "@aws-amplify/backend";

export const requestToolList = defineFunction({
  name: "request-tool-list",
  entry: "./handler.ts",
  resourceGroupName: "agentcore-tools",
});
