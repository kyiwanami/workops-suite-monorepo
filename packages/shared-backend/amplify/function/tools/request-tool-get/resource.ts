import { defineFunction } from "@aws-amplify/backend";

export const requestToolGet = defineFunction({
  name: "request-tool-get",
  entry: "./handler.ts",
  resourceGroupName: "agentcore-tools",
});
