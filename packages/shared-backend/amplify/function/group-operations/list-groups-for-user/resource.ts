import { defineFunction } from "@aws-amplify/backend";

export const listGroupsForUserFunction = defineFunction({
  name: "listGroupsForUser",
  entry: "./handler.ts",
  logging: { retention: "3 months" },
});
