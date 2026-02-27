import { defineFunction } from "@aws-amplify/backend";

export const attachPreTokenTriggerFunction = defineFunction({
  name: "attach-pre-token-trigger",
  entry: "./handler.ts",
  timeoutSeconds: 60,
});
