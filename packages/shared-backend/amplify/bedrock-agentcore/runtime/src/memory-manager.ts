import {
  BedrockAgentCoreClient,
  CreateEventCommand,
  ListEventsCommand,
  RetrieveMemoryRecordsCommand,
  type Event,
  type MemoryRecordSummary,
  type PayloadType,
} from "@aws-sdk/client-bedrock-agentcore";
import type { MemoryContext } from "./types.js";

const MAX_EVENTS = 20;
const MAX_MEMORY_RECORDS = 10;

export class MemoryManager {
  private readonly client: BedrockAgentCoreClient;

  constructor(
    private readonly memoryId: string,
    region: string,
  ) {
    this.client = new BedrockAgentCoreClient({ region });
  }

  async saveConversation(actorId: string, sessionId: string, query: string, answer: string): Promise<void> {
    const payload: PayloadType[] = [
      {
        conversational: {
          content: { text: query },
          role: "USER",
        },
      },
      {
        conversational: {
          content: { text: answer },
          role: "ASSISTANT",
        },
      },
    ];

    await this.client.send(
      new CreateEventCommand({
        memoryId: this.memoryId,
        actorId,
        sessionId,
        eventTimestamp: new Date(),
        payload,
      }),
    );
  }

  async buildConversationContext(sessionId: string, actorId: string, query: string): Promise<MemoryContext> {
    const recentEvents = await this.listEvents(sessionId, actorId);
    const relevantMemories = await this.retrieveMemoryRecords(actorId, sessionId, query);
    return { recentEvents, relevantMemories };
  }

  private async listEvents(sessionId: string, actorId: string): Promise<Event[]> {
    const response = await this.client.send(
      new ListEventsCommand({
        memoryId: this.memoryId,
        sessionId,
        actorId,
        maxResults: MAX_EVENTS,
        includePayloads: true,
      }),
    );

    if (response.events === undefined) {
      throw new Error("AgentCore Memory did not return events");
    }

    return response.events;
  }

  private async retrieveMemoryRecords(actorId: string, sessionId: string, query: string): Promise<MemoryRecordSummary[]> {
    const namespaces = [
      `/app/semantic/actors/${actorId}`,
      `/app/preference/actors/${actorId}`,
      `/app/summarization/actors/${actorId}/sessions/${sessionId}`,
    ];
    const perNamespace = Math.max(1, Math.floor(MAX_MEMORY_RECORDS / namespaces.length));
    const records: MemoryRecordSummary[] = [];

    for (const namespace of namespaces) {
      const response = await this.client.send(
        new RetrieveMemoryRecordsCommand({
          memoryId: this.memoryId,
          namespace,
          searchCriteria: {
            searchQuery: query,
            topK: perNamespace,
          },
        }),
      );

      if (response.memoryRecordSummaries === undefined) {
        throw new Error(`AgentCore Memory did not return records for ${namespace}`);
      }

      records.push(...response.memoryRecordSummaries);
    }

    return records;
  }
}
