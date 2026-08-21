import {
  BedrockAgentCoreClient,
  InvokeHarnessCommand,
  type HarnessMessage,
  type InvokeHarnessStreamOutput,
} from "@aws-sdk/client-bedrock-agentcore";
import { env } from "$amplify/env/agentcore-bff";
import type { APIGatewayProxyWithCognitoAuthorizerEvent } from "aws-lambda";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { z } from "zod";
import { ManagedMemoryAdapter } from "./managed-memory";
import { createBearerHarnessClient } from "./harness-client";

const agentCoreClient = new BedrockAgentCoreClient({});
const memory = new ManagedMemoryAdapter(agentCoreClient, env.MANAGED_MEMORY_ARN);
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Authorization,Content-Type",
  "Access-Control-Allow-Methods": "GET,POST,DELETE,OPTIONS",
};
const sessionIdSchema = z.string().uuid();
// Browserから受け取る質問本文だけをBFF境界で許可する。
const messageBodySchema = z
  .object({ query: z.string().min(1).max(10_000) })
  .strict();

type MessageBody = z.infer<typeof messageBodySchema>;

// 入力不備と連携障害を、ストリーム開始前のHTTP statusへ対応付ける。
class RequestValidationError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "RequestValidationError";
  }
}

// Cognito authorizerが検証した利用者IDを取得する。
function getActorId(
  event: APIGatewayProxyWithCognitoAuthorizerEvent,
): string {
  const claims = event.requestContext.authorizer.claims;
  const actorId = claims.sub;
  if (!actorId) {
    throw new RequestValidationError("verified Cognito claims are incomplete");
  }
  return actorId;
}

// API Gatewayの本文をUTF-8 JSON文字列へ戻す。
function bodyText(event: APIGatewayProxyWithCognitoAuthorizerEvent): string {
  if (!event.body) {
    return "{}";
  }
  if (event.isBase64Encoded) {
    return Buffer.from(event.body, "base64").toString("utf8");
  }
  return event.body;
}

// URL上のsessionIdをUUIDとして検証する。
function pathSessionId(event: APIGatewayProxyWithCognitoAuthorizerEvent): string {
  return sessionIdSchema.parse(event.pathParameters?.sessionId);
}

// Harnessへ委譲する利用者のBearer tokenを検証する。
function authorizationToken(
  event: APIGatewayProxyWithCognitoAuthorizerEvent,
): string {
  const header = Object.entries(event.headers ?? {}).find(
    ([name]) => name.toLowerCase() === "authorization",
  )?.[1];
  const token = header ? /^Bearer ([^\s]+)$/i.exec(header)?.[1] : undefined;
  if (!token) {
    throw new RequestValidationError("Bearer token is required");
  }
  return token;
}

// ストリーム開始前の応答をJSONとして確定する。
function jsonResponse(
  stream: awslambda.HttpResponseStream,
  statusCode: number,
  value: object,
): void {
  const response = awslambda.HttpResponseStream.from(stream, {
    statusCode,
    headers: {
      ...cors,
      "Content-Type": "application/json; charset=utf-8",
    },
  });
  response.write(JSON.stringify(value));
  response.end();
}

// Harnessの回答文字列だけをBrowserへ逐次返す。
function textResponse(
  stream: awslambda.HttpResponseStream,
): awslambda.HttpResponseStream {
  return awslambda.HttpResponseStream.from(stream, {
    statusCode: 200,
    headers: {
      ...cors,
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
}

// Browserの質問をHarnessの利用者messageへ変換する。
function userMessage(query: string): HarnessMessage {
  return {
    role: "user",
    content: [{ text: query }],
  } satisfies HarnessMessage;
}

// Harnessを開始し、HTTP 200を始める前にstreamの存在を確認する。
async function invokeHarness(
  client: BedrockAgentCoreClient,
  sessionId: string,
  actorId: string,
  messages: readonly HarnessMessage[],
): Promise<AsyncIterable<InvokeHarnessStreamOutput>> {
  const result = await client.send(
    new InvokeHarnessCommand({
      harnessArn: env.HARNESS_ARN,
      runtimeSessionId: sessionId,
      actorId,
      messages: [...messages],
    }),
  );
  if (!result.stream) {
    throw new Error("Harness stream is unavailable");
  }
  return result.stream;
}

// Harnessの完了条件を検証しながら、回答文字列だけを生成する。
async function* readHarnessText(
  stream: AsyncIterable<InvokeHarnessStreamOutput>,
): AsyncGenerator<string> {
  let stopReason = "";

  for await (const event of stream) {
    if ("$unknown" in event) {
      throw new Error("Harness returned an unknown stream event");
    }
    if (event.contentBlockDelta) {
      const delta = event.contentBlockDelta.delta;
      if (!delta) {
        continue;
      }
      if ("text" in delta && delta.text) {
        yield delta.text;
      }
    }
    if (event.internalServerException) {
      throw new Error("Harness returned an internal error");
    }
    if (event.validationException) {
      throw new Error("Harness rejected the request");
    }
    if (event.runtimeClientError) {
      throw new Error("Harness runtime failed");
    }
    if (event.messageStop) {
      if (!event.messageStop.stopReason) {
        throw new Error("Harness returned no stop reason");
      }
      stopReason = event.messageStop.stopReason;
    }
  }

  if (!stopReason) {
    throw new Error("Harness stream ended without a stop reason");
  }
  if (stopReason !== "end_turn") {
    throw new Error("Harness did not complete the response");
  }
}

// Harnessの回答をNode.js標準pipelineでHTTP responseへ転送する。
async function streamMessage(
  actorId: string,
  sessionId: string,
  body: MessageBody,
  event: APIGatewayProxyWithCognitoAuthorizerEvent,
  stream: awslambda.HttpResponseStream,
): Promise<void> {
  const userToken = authorizationToken(event);
  const client = createBearerHarnessClient(userToken);
  try {
    const harnessStream = await invokeHarness(
      client,
      sessionId,
      actorId,
      [userMessage(body.query)],
    );
    const response = textResponse(stream);
    try {
      await pipeline(
        Readable.from(readHarnessText(harnessStream), { objectMode: false }),
        response,
      );
    } catch (error) {
      console.error("AgentCore Harness stream error", error);
    }
  } finally {
    client.destroy();
  }
}

export const handler = awslambda.streamifyResponse<
  APIGatewayProxyWithCognitoAuthorizerEvent
>(async (event, stream) => {
  let started = false;
  try {
    const actorId = getActorId(event);
    const resource = event.resource;
    if (event.httpMethod === "GET" && resource === "/chat/sessions") {
      const sessions = await memory.listSessions(actorId);
      started = true;
      jsonResponse(stream, 200, { sessions });
      return;
    }
    if (
      event.httpMethod === "GET" &&
      resource === "/chat/sessions/{sessionId}/messages"
    ) {
      const messages = await memory.listMessages(
        actorId,
        pathSessionId(event),
      );
      started = true;
      jsonResponse(stream, 200, { messages });
      return;
    }
    if (
      event.httpMethod === "DELETE" &&
      resource === "/chat/sessions/{sessionId}"
    ) {
      await memory.deleteSession(actorId, pathSessionId(event));
      started = true;
      jsonResponse(stream, 200, { deleted: true });
      return;
    }
    if (
      event.httpMethod === "POST" &&
      resource === "/chat/sessions/{sessionId}/messages"
    ) {
      const body = messageBodySchema.parse(JSON.parse(bodyText(event)));
      await streamMessage(
        actorId,
        pathSessionId(event),
        body,
        event,
        stream,
      );
      return;
    }
    started = true;
    jsonResponse(stream, 404, { message: "not found" });
  } catch (error) {
    console.error("AgentCore BFF error", error);
    if (!started) {
      const statusCode =
        error instanceof RequestValidationError ||
        error instanceof z.ZodError ||
        error instanceof SyntaxError
          ? 400
          : 502;
      jsonResponse(stream, statusCode, { message: "request failed" });
    }
  }
});
