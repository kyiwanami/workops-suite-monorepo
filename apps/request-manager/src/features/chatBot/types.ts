import type { Message as BedrockMessage } from "@aws-sdk/client-bedrock-runtime";
import type { Schema } from "@workops/data-schema";

export interface KbChunk {
  text: string;
  source?: string;
  score?: number;
}

export interface ToolCallDisplay {
  toolUseId: string;
  name: string;
  input: Record<string, string | number | boolean>;
}

export interface ToolResultDisplay {
  toolUseId: string;
  toolName: string;
  status: string;
  kbChunks?: KbChunk[];
}

export interface TraceStep {
  role: ChatRole;
  text?: string;
  toolCalls: ToolCallDisplay[];
  toolResults: ToolResultDisplay[];
}

export interface Message {
  id?: string;
  role: ChatRole;
  content: string;
  traces?: TraceStep[];
  createdAt: string;
}

export interface Session {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface SearchTodosResult {
  results: KbChunk[];
}

// スキーマEnumに合わせたチャットロール
export type ChatRole = Schema["ChatRole"]["type"];

// 内部ロジック用
export type { BedrockMessage };
