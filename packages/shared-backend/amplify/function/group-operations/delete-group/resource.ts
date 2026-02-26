import { defineFunction } from "@aws-amplify/backend";

export const deleteGroupFunction = defineFunction({
  name: "deleteGroup",
  entry: "./handler.ts",
});
