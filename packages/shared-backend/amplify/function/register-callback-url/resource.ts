import { defineFunction } from "@aws-amplify/backend";

export const registerCallbackUrlFunction = defineFunction({
  name: "register-callback-url",
  entry: "./handler.ts",
  timeoutSeconds: 30,
});
