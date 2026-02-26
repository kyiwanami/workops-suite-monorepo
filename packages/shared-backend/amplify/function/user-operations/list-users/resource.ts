import { defineFunction } from "@aws-amplify/backend";

export const listUsersFunction = defineFunction({
  name: "listUsers",
  entry: "./handler.ts",
  resourceGroupName: "user-operations",
});
