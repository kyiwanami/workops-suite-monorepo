import {
  Agent,
  BedrockModel,
  BeforeToolCallEvent,
  McpClient,
  MemoryManager,
  type ContentBlockData,
  type ToolUseData,
} from "@strands-agents/sdk";
import { createAgentCoreMemoryStores } from "bedrock-agentcore/experimental/memory/strands";
import { buildSystemPrompt } from "./prompts.js";
import type {
  AgentRequest,
  AgentResponse,
  Attachment,
  DocumentFormat,
} from "./types.js";
import { documentFormatSchema } from "./types.js";

const MODEL_ID = "jp.anthropic.claude-sonnet-4-6";
const MAX_TOOL_ITERATIONS = 10;

// Memory、Gateway、Bedrock Converseをつなぎ、Runtimeの1リクエストを処理する。
export const runAgent = async (
  request: AgentRequest,
  region: string,
  memoryId: string,
  gatewayUrl: string,
): Promise<AgentResponse> => {
  if (gatewayUrl.length === 0) {
    throw new Error("AGENTCORE_GATEWAY_URL is required");
  }

  const mcp = new McpClient({
    url: gatewayUrl,
    headers: {
      Authorization: request.authHeader,
    },
    applicationName: "workops-suite-agentcore-runtime",
    applicationVersion: "1.0.0",
  });
  const mem = new MemoryManager({
    stores: createAgentCoreMemoryStores({
      memoryId,
      actorId: request.actorId,
      sessionId: request.sessionId,
      region,
      extraction: true,
      namespaces: [
        {
          name: "semantic",
          namespace: "/app/semantic/actors/{actorId}",
          description: "ユーザーの業務文脈に関する長期記憶",
          maxSearchResults: 4,
          writable: true,
        },
        {
          name: "preference",
          namespace: "/app/preference/actors/{actorId}",
          description: "ユーザーの好みや作業方針に関する長期記憶",
          maxSearchResults: 3,
        },
        {
          name: "summarization",
          namespace: "/app/summarization/actors/{actorId}/sessions/{sessionId}",
          description: "現在セッションの要約記憶",
          maxSearchResults: 3,
        },
      ],
    }),
    searchToolConfig: true,
    addToolConfig: false,
    injection: {
      maxEntries: 10,
    },
  });
  const agent = new Agent({
    model: new BedrockModel({
      region,
      modelId: MODEL_ID,
      maxTokens: 2048,
      temperature: 0.1,
      includeToolResultStatus: true,
    }),
    tools: [mcp],
    memoryManager: mem,
    systemPrompt: buildSystemPrompt(),
    printer: false,
    toolExecutor: "sequential",
  });

  agent.addHook(BeforeToolCallEvent, (event) => {
    if (isApproveTool(event.toolUse.name)) {
      event.toolUse = addApproverSub(event.toolUse, request.actorId);
    }
  });

  try {
    const result = await agent.invoke(buildInitialContent(request.query, request.attachments), {
      limits: {
        turns: MAX_TOOL_ITERATIONS,
      },
    });

    if (result.stopReason !== "endTurn") {
      throw new Error(`Unexpected Strands stop reason: ${result.stopReason}`);
    }

    const answer = result.toString();
    if (answer.length === 0) {
      throw new Error("Strands agent did not return answer text");
    }

    await mem.flush();
    return {
      answer,
      sessionId: request.sessionId,
    };
  } finally {
    await mcp.disconnect();
  }
};

const buildInitialContent = (query: string, attachments: Attachment[]): ContentBlockData[] => {
  const content: ContentBlockData[] = [{ text: query }];

  for (const attachment of attachments) {
    content.push({
      document: {
        name: `file-${content.length}`,
        format: documentFormat(attachment.name),
        source: {
          bytes: Buffer.from(attachment.base64, "base64"),
        },
      },
    });
  }

  return content;
};

const documentFormat = (name: string): DocumentFormat => {
  const index = name.lastIndexOf(".");
  if (index < 0) {
    throw new Error("Attachment name must include extension");
  }

  const extension = name.slice(index + 1).toLowerCase();
  const parsed = documentFormatSchema.safeParse(extension);
  if (!parsed.success) {
    throw new Error(`Unsupported attachment extension: ${extension}`);
  }

  return parsed.data;
};

const isApproveTool = (name: string): boolean => (
  name === "approve-request" || name.endsWith("__approve-request") || name.endsWith("___approve-request")
);

const addApproverSub = (toolUse: ToolUseData, actorId: string): ToolUseData => {
  const input = toolUse.input;
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    throw new Error("approve-request tool input must be a JSON object");
  }

  return {
    name: toolUse.name,
    toolUseId: toolUse.toolUseId,
    input: {
      ...input,
      approverSub: actorId,
    },
  };
};
