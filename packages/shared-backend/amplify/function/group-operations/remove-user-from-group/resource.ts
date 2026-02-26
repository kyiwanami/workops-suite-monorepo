import { defineFunction } from "@aws-amplify/backend";

export const removeUserFromGroupFunction = defineFunction({
  name: "removeUserFromGroup",
  entry: "./handler.ts",
});
