import { defineFunction } from "@aws-amplify/backend";

export const preTokenGenerationFunction = defineFunction({
  name: "pre-token-generation",
  resourceGroupName: "auth",
  logging: { retention: "3 months" },
});
