import { defineFunction } from "@aws-amplify/backend";

/**
 * Cognito claimを検証済みChat APIへ変換するAgentCore BFF Lambda。
 * HarnessとGatewayの接続先、およびManaged MemoryのARNをbackend側から注入する。
 */
export const agentcoreBff = defineFunction({
  name: "agentcore-bff",
  entry: "./handler.ts",
  resourceGroupName: "agentcore-bff",
  runtime: 24,
  timeoutSeconds: 300,
  memoryMB: 1024,
  ephemeralStorageSizeMB: 512,
  logging: { retention: "3 months" },
});
