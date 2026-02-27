import { defineFunction } from "@aws-amplify/backend";

export const requestToolCreate = defineFunction({
  name: "request-tool-create",
  entry: "./handler.ts",
  resourceGroupName: "agentcore-tools",
});
