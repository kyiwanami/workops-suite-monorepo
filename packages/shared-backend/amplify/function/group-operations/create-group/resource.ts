import { defineFunction } from "@aws-amplify/backend";

export const createGroupFunction = defineFunction({
  name: "createGroup",
  entry: "./handler.ts",
});
