import { useEffect, useState } from "react";
import { generateClient } from "aws-amplify/data";
import { v4 as uuidv4 } from "uuid";
import type { Schema } from "@workops/data-schema";
import type { Session } from "../types";
import packageJson from "../../../../package.json";

const client = generateClient<Schema>();
const CHAT_PROJECT_ID = packageJson.name;

export function useSessions() {
  const [sessions, setSessions] = useState<Session[]>([]);

  // セッション一覧を updatedAt の降順で取得する
  const loadSessions = async () => {
    const { data, errors } = await client.queries.listSessions({
      projectId: CHAT_PROJECT_ID,
      limit: 50,
    });

    if (errors) {
      console.error("Session list error", errors);
      setSessions([]);
      return;
    }

    const sessionList: Session[] = (data?.items ?? []).map((item) => ({
      id: item.sessionId,
      name: item.name ?? "無題の会話",
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    }));

    setSessions(sessionList);
  };

  useEffect(() => {
    void loadSessions();
  }, []);

  // 新規セッション作成用のIDを払い出す
  const createSession = (): string => {
    const newSessionId = uuidv4();
    return newSessionId;
  };

  // セッション削除時に配下メッセージを先に削除して整合性を保つ
  const deleteSession = async (sessionId: string) => {
    let varNextToken: string | null | undefined;
    const allMessages: Schema["ChatMessage"]["type"][] = [];

    do {
      const { data, errors } = await client.queries.listMessages({
        projectId: CHAT_PROJECT_ID,
        sessionId,
        limit: 1000,
        nextToken: varNextToken ?? undefined,
        direction: "DESC",
      });

      if (errors) {
        console.error("Message list error", errors);
        return;
      }

      allMessages.push(...(data?.items ?? []));
      varNextToken = data?.nextToken ?? undefined;
    } while (varNextToken);

    for (const message of allMessages) {
      const { errors } = await client.mutations.deleteMessage({
        projectId: CHAT_PROJECT_ID,
        sessionId,
        messageId: message.messageId,
      });

      if (errors) {
        console.error("Message delete error", errors);
        return;
      }
    }

    const { errors } = await client.mutations.deleteSession({
      projectId: CHAT_PROJECT_ID,
      sessionId,
    });

    if (errors) {
      console.error("Session delete error", errors);
      return;
    }

    await loadSessions();
  };

  return {
    sessions,
    createSession,
    deleteSession,
  };
}
