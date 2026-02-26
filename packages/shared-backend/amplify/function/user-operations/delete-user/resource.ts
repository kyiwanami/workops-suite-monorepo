import { defineFunction } from "@aws-amplify/backend";

export const deleteUserFunction = defineFunction({
  name: "deleteUser",
  entry: "./handler.ts",
  resourceGroupName: "user-operations",
});
