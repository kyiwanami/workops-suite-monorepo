import { defineFunction } from "@aws-amplify/backend";

export const addUserToGroupFunction = defineFunction({
  name: "addUserToGroup",
  entry: "./handler.ts",
  logging: { retention: "3 months" },
});
