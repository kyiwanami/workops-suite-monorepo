import { defineFunction } from "@aws-amplify/backend";

export const requestKbSearch = defineFunction({
  name: "request-kb-search",
  entry: "./handler.ts",
  resourceGroupName: "agentcore-tools",
});
