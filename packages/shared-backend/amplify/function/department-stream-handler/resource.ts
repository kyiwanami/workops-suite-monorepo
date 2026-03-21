import { defineFunction } from "@aws-amplify/backend";

export const departmentStreamHandlerFunction = defineFunction({
  name: "department-stream-handler",
  entry: "./handler.ts",
  resourceGroupName: "data",
  logging: { retention: "3 months" },
});
