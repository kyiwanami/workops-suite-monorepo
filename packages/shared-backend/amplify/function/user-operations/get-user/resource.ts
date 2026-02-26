import { defineFunction } from "@aws-amplify/backend";

export const getUserFunction = defineFunction({
  name: "getUser",
  entry: "./handler.ts",
  resourceGroupName: "user-operations",
});
