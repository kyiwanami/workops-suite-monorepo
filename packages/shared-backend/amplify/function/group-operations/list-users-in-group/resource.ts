import { defineFunction } from "@aws-amplify/backend";

export const listUsersInGroupFunction = defineFunction({
  name: "listUsersInGroup",
  entry: "./handler.ts",
});
