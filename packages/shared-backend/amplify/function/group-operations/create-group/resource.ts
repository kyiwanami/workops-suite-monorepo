import { defineFunction } from "@aws-amplify/backend";

export const createGroupFunction = defineFunction({
  name: "createGroup",
  entry: "./handler.ts",
  logging: { retention: "3 months" },
});
