import { defineFunction } from "@aws-amplify/backend";

export const listGroupsFunction = defineFunction({
  name: "listGroups",
  entry: "./handler.ts",
  logging: { retention: "3 months" },
});
