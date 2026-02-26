import { defineFunction } from "@aws-amplify/backend";

export const createUserFunction = defineFunction({
  name: "createUser",
  entry: "./handler.ts",
  resourceGroupName: "user-operations",
});
