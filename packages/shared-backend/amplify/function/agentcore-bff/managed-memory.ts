import {
  BedrockAgentCoreClient,
  DeleteEventCommand,
  ListEventsCommand,
  ListSessionsCommand,
  ResourceNotFoundException,
} from "@aws-sdk/client-bedrock-agentcore";
import { z } from "zod";

const harnessMemoryEnvelopeSchema = z
  .object({
    message: z
      .object({
        role: z.enum(["user", "assistant"]),
        content: z
          .array(z.object({ text: z.string().optional() }).passthrough()),
      })
      .passthrough(),
  })
  .passthrough();

export interface MemorySession {
  id: string;
  createdAt: string;
}

export interface MemoryMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}

interface VisibleMemoryMessage {
  role: "user" | "assistant";
  content: string;
}

/**
 * AgentCore managed MemoryのページングとDTO変換をBFFから隔離する境界。
 * SDKのページ形式や削除順をhandlerへ漏らさず、Memoryの正本だけを扱う。
 */
export class ManagedMemoryAdapter {
  private readonly client: BedrockAgentCoreClient;
  private readonly memoryId: string;

  public constructor(client: BedrockAgentCoreClient, memoryId: string) {
    this.client = client;
    this.memoryId = memoryId;
  }

  public async listSessions(actorId: string): Promise<MemorySession[]> {
    const sessions: MemorySession[] = [];
    let nextToken: string | undefined;

    try {
      do {
        const page = await this.client.send(
          new ListSessionsCommand({
            memoryId: this.memoryId,
            actorId,
            maxResults: 100,
            filter: { eventFilter: "HAS_EVENTS" },
            nextToken,
          }),
        );
        for (const item of page.sessionSummaries ?? []) {
          if (!item.sessionId || !item.createdAt) {
            continue;
          }
          sessions.push({
            id: item.sessionId,
            createdAt: item.createdAt.toISOString(),
          });
        }
        nextToken = page.nextToken ?? undefined;
      } while (nextToken);
    } catch (error) {
      if (!(error instanceof Error) || !isMissingActor(error)) {
        throw error;
      }
    }

    sessions.sort((left, right) =>
      right.createdAt.localeCompare(left.createdAt) ||
      right.id.localeCompare(left.id),
    );
    return sessions;
  }

  public async listMessages(
    actorId: string,
    sessionId: string,
  ): Promise<MemoryMessage[]> {
    const messages: MemoryMessage[] = [];
    let nextToken: string | undefined;

    try {
      do {
        const page = await this.client.send(
          new ListEventsCommand({
            memoryId: this.memoryId,
            actorId,
            sessionId,
            includePayloads: true,
            maxResults: 100,
            nextToken,
          }),
        );
        for (const event of page.events ?? []) {
          if (!event.eventId || !event.eventTimestamp) {
            continue;
          }
          for (const [payloadIndex, payload] of (
            event.payload ?? []
          ).entries()) {
            if (!("conversational" in payload)) {
              continue;
            }
            const conversational = payload.conversational;
            if (!conversational || !conversational.content) {
              continue;
            }
            const content = conversational.content;
            if (!("text" in content) || !content.text) {
              continue;
            }
            if (
              conversational.role !== "USER" &&
              conversational.role !== "ASSISTANT"
            ) {
              continue;
            }
            const role =
              conversational.role === "USER" ? "user" : "assistant";
            const visible = visibleMemoryMessage(content.text);
            if (!visible || visible.role !== role) {
              continue;
            }
            messages.push({
              id: `${event.eventId}:${payloadIndex}`,
              ...visible,
              createdAt: event.eventTimestamp.toISOString(),
            });
          }
        }
        nextToken = page.nextToken ?? undefined;
      } while (nextToken);
    } catch (error) {
      if (
        !(error instanceof Error) ||
        (!isMissingSession(error) && !isMissingActor(error))
      ) {
        throw error;
      }
    }

    messages.sort((left, right) =>
      left.createdAt.localeCompare(right.createdAt) ||
      left.id.localeCompare(right.id),
    );
    return mergeAssistantMessages(messages);
  }

  public async deleteSession(actorId: string, sessionId: string): Promise<void> {
    const eventIds: string[] = [];
    let nextToken: string | undefined;

    try {
      // 全ページを先に読み切る。削除しながらページを進めるとnextTokenが無効化され、eventを取りこぼすため。
      do {
        const page = await this.client.send(
          new ListEventsCommand({
            memoryId: this.memoryId,
            actorId,
            sessionId,
            includePayloads: false,
            maxResults: 100,
            nextToken,
          }),
        );
        for (const event of page.events ?? []) {
          if (event.eventId) {
            eventIds.push(event.eventId);
          }
        }
        nextToken = page.nextToken ?? undefined;
      } while (nextToken);
    } catch (error) {
      if (
        !(error instanceof Error) ||
        (!isMissingSession(error) && !isMissingActor(error))
      ) {
        throw error;
      }
    }

    for (const eventId of eventIds) {
      await this.client.send(
        new DeleteEventCommand({
          memoryId: this.memoryId,
          actorId,
          sessionId,
          eventId,
        }),
      );
    }
  }
}

// HarnessがManaged Memoryへ保存した会話本文だけを表示用に取り出す。
function visibleMemoryMessage(text: string): VisibleMemoryMessage | undefined {
  try {
    const parsed = JSON.parse(text);
    const envelope = harnessMemoryEnvelopeSchema.safeParse(parsed);
    if (!envelope.success) {
      // Harness内部JSONやprotocol payloadは、未知の形式でもUIへ露出させない。
      return undefined;
    }
    const content = envelope.data.message.content
      .map((block) => block.text ?? "")
      .join("");
    if (!content) {
      return undefined;
    }
    const role = envelope.data.message.role;
    return {
      role,
      content,
    };
  } catch {
    // JSONとして検証できないMemory eventは内部payloadと区別できないため表示しない。
    return undefined;
  }
}

// Harnessが分割保存した連続assistant messageを画面上の1件へまとめる。
function mergeAssistantMessages(messages: MemoryMessage[]): MemoryMessage[] {
  const visible: MemoryMessage[] = [];
  for (const message of messages) {
    const previous = visible.at(-1);
    if (message.role === "assistant" && previous?.role === "assistant") {
      previous.content = `${previous.content}\n\n${message.content}`;
      continue;
    }
    visible.push(message);
  }
  return visible;
}

// Managed Memoryがactor未作成を示した場合だけ空一覧として扱う。
function isMissingActor(error: Error): boolean {
  return (
    error instanceof ResourceNotFoundException &&
    error.message.startsWith("Actor ")
  );
}

// Managed Memoryがsession未作成を示した場合だけ空一覧として扱う。
function isMissingSession(error: Error): boolean {
  return (
    error instanceof ResourceNotFoundException &&
    error.message.startsWith("Session ")
  );
}
