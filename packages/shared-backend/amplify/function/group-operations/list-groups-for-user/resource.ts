import { defineFunction } from "@aws-amplify/backend";

export const listGroupsForUserFunction = defineFunction({
  name: "listGroupsForUser",
  entry: "./handler.ts",
});
