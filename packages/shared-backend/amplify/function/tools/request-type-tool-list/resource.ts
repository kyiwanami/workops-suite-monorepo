import { defineFunction } from "@aws-amplify/backend";

export const requestTypeToolList = defineFunction({
  name: "request-type-tool-list",
  entry: "./handler.ts",
  resourceGroupName: "agentcore-tools",
  logging: { retention: "3 months" },
});
