import { jwtDecode } from "jwt-decode";
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

  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length)
    : authHeader;
  const jwtPayload = jwtPayloadSchema.parse(jwtDecode(token));
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

const app = new BedrockAgentCoreApp({
  invocationHandler: {
    requestSchema: invocationSchema,
    process: processInvocation,
  },
});

app.run();
