import { defineFunction } from "@aws-amplify/backend";

export const setUserEnabledFunction = defineFunction({
  name: "setUserEnabled",
  entry: "./handler.ts",
  resourceGroupName: "user-operations",
  logging: { retention: "3 months" },
});
