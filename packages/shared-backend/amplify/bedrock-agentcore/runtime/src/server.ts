import { Buffer } from "buffer";
import { BedrockAgentCoreApp, type RequestContext } from "bedrock-agentcore/runtime";
import { runAgent } from "./agent.js";
import {
  invocationSchema,
  jwtPayloadSchema,
  type AgentResponse,
  type InvocationBody,
} from "./types.js";

// AgentCore Runtime公式SDKのHTTP serverを起動し、JWT subをactorIdとしてagentへ渡す。
const processInvocation = async (
  request: InvocationBody,
  context: RequestContext,
): Promise<AgentResponse> => {
  const authHeader = context.headers.authorization;
  if (authHeader === undefined || authHeader.length === 0) {
    throw new Error("Authorization header is required");
  }

  const jwtPayload = jwtPayloadSchema.parse(JSON.parse(decodeJwtPayload(authHeader)));
  return runAgent(
    {
      query: request.query,
      sessionId: request.sessionId,
      attachments: request.attachments ?? [],
      actorId: jwtPayload.sub,
      authHeader,
    },
    requireEnv("AWS_REGION"),
    requireEnv("AGENTCORE_MEMORY_ID"),
    requireEnv("AGENTCORE_GATEWAY_URL"),
  );
};

const requireEnv = (name: string): string => {
  const value = process.env[name];
  if (value === undefined || value.length === 0) {
    throw new Error(`${name} is required`);
  }
  return value;
};

const decodeJwtPayload = (authHeader: string): string => {
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length)
    : authHeader;
  const parts = token.split(".");
  if (parts.length !== 3) {
    throw new Error("Authorization header does not contain a valid JWT");
  }

  const payload = parts[1];
  if (payload === undefined || payload.length === 0) {
    throw new Error("Authorization header does not contain a JWT payload");
  }

  const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
  const paddingLength = (4 - (normalized.length % 4)) % 4;
  return Buffer.from(`${normalized}${"=".repeat(paddingLength)}`, "base64").toString("utf8");
};

const app = new BedrockAgentCoreApp({
  invocationHandler: {
    requestSchema: invocationSchema,
    process: processInvocation,
  },
});

app.run();
