import {
  BedrockRuntimeClient,
  ConverseCommand,
  type ContentBlock,
  type Message,
  type ToolResultBlock,
  type ToolResultContentBlock,
  type ToolUseBlock,
} from "@aws-sdk/client-bedrock-runtime";
import { z } from "zod";
import { MemoryManager } from "./memory-manager.js";
import { McpClient } from "./mcp-client.js";
import { buildSystemPrompt } from "./prompts.js";
import type {
  AgentRequest,
  AgentResponse,
  Attachment,
  RuntimeConfig,
} from "./types.js";
import { documentFormatSchema } from "./types.js";

const MODEL_ID = "jp.anthropic.claude-sonnet-4-6";
const MAX_TOOL_ITERATIONS = 10;

const toolArgsSchema = z.object({}).passthrough();

// Memory、Gateway、Bedrock Converseをつなぎ、Runtimeの1リクエストを処理する。
export const runAgent = async (
  request: AgentRequest,
  config: RuntimeConfig,
): Promise<AgentResponse> => {
  if (config.gatewayUrl.length === 0) {
    throw new Error("AGENTCORE_GATEWAY_URL is required");
  }

  const memoryManager = new MemoryManager(config.memoryId, config.region);
  const memoryContext = await memoryManager.buildConversationContext(
    request.sessionId,
    request.actorId,
    request.query,
  );

  const mcp = new McpClient(config.gatewayUrl, request.authHeader);
  const bedrockTools = await mcp.listTools();
  const bedrock = new BedrockRuntimeClient({ region: config.region });
  const messages: Message[] = [
    {
      role: "user",
      content: buildInitialContent(request.query, request.attachments),
    },
  ];

  for (let index = 0; index < MAX_TOOL_ITERATIONS; index += 1) {
    const response = await bedrock.send(
      new ConverseCommand({
        modelId: MODEL_ID,
        messages,
        system: [{ text: buildSystemPrompt(memoryContext) }],
        toolConfig: { tools: bedrockTools },
        inferenceConfig: {
          maxTokens: 2048,
          temperature: 0.1,
        },
      }),
    );

    const message = response.output?.message;
    if (message === undefined) {
      throw new Error("Bedrock Converse did not return a message");
    }
    messages.push(message);

    if (response.stopReason === "end_turn") {
      const answer = getAnswer(message);
      await memoryManager.saveConversation(request.actorId, request.sessionId, request.query, answer);
      return {
        answer,
        sessionId: request.sessionId,
      };
    }

    if (response.stopReason === "tool_use") {
      messages.push({
        role: "user",
        content: await runTools(message, mcp, request.actorId),
      });
      continue;
    }

    throw new Error(`Unexpected Bedrock stop reason: ${response.stopReason}`);
  }

  throw new Error(`Tool calling loop exceeded maximum iterations (${MAX_TOOL_ITERATIONS})`);
};

const buildInitialContent = (query: string, attachments: Attachment[]): ContentBlock[] => {
  const content: ContentBlock[] = [{ text: query }];

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

const documentFormat = (name: string) => {
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

const getAnswer = (message: Message): string => {
  const content = message.content;
  if (content === undefined) {
    throw new Error("Bedrock message did not include content");
  }

  for (const block of content) {
    if (block.text !== undefined && block.text.length > 0) {
      return block.text;
    }
  }

  throw new Error("Bedrock message did not include answer text");
};

const runTools = async (message: Message, mcp: McpClient, actorId: string): Promise<ContentBlock[]> => {
  const content = message.content;
  if (content === undefined) {
    throw new Error("Bedrock tool_use message did not include content");
  }

  const toolResults: ContentBlock[] = [];
  for (const block of content) {
    const toolUse = block.toolUse;
    if (toolUse === undefined) {
      continue;
    }

    toolResults.push({
      toolResult: await runTool(toolUse, mcp, actorId),
    });
  }

  if (toolResults.length === 0) {
    throw new Error("Bedrock requested tool_use without toolUse blocks");
  }

  return toolResults;
};

const runTool = async (
  toolUse: ToolUseBlock,
  mcp: McpClient,
  actorId: string,
): Promise<ToolResultBlock> => {
  if (toolUse.name === undefined || toolUse.toolUseId === undefined) {
    throw new Error("Bedrock toolUse block missed name or id");
  }

  try {
    const result = await mcp.callTool(toolUse.name, toolInput(toolUse, actorId));
    return {
      toolUseId: toolUse.toolUseId,
      content: result,
      status: "success",
    };
  } catch (error) {
    return {
      toolUseId: toolUse.toolUseId,
      content: [{ text: `Error: ${String(error)}` }] satisfies ToolResultContentBlock[],
      status: "error",
    };
  }
};

const toolInput = (toolUse: ToolUseBlock, actorId: string): ToolUseBlock["input"] => {
  const input = toolArgsSchema.parse(toolUse.input);
  if (toolUse.name !== "approve-request") {
    return JSON.parse(JSON.stringify(input));
  }

  return JSON.parse(JSON.stringify({
    ...input,
    approverSub: actorId,
  }));
};
