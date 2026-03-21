import { useEffect, useState } from "react";
import { generateClient } from "aws-amplify/data";
import type { Schema } from "@workops/data-schema";
import type { Session } from "../types";
import { useChatBotConfig } from "../context/ChatBotConfigContext";

const client = generateClient<Schema>();

export function useSessions() {
  const { projectId } = useChatBotConfig();
  const [sessions, setSessions] = useState<Session[]>([]);

  // セッション一覧を updatedAt の降順で取得する
  const loadSessions = async () => {
    const { data, errors } =
      await client.models.ChatSession.listChatSessionByProjectId(
        {
          projectId,
        },
        {
          limit: 50,
          sortDirection: "DESC",
        }
      );

    if (errors) {
      console.error("Session list error", errors);
      setSessions([]);
      return;
    }

    const sessionList: Session[] = (data ?? []).map((item) => ({
      id: item.id,
      name: item.name ?? "無題の会話",
      createdAt: item.createdAt ?? "",
      updatedAt: item.updatedAt ?? "",
    }));

    setSessions(sessionList);
  };

  useEffect(() => {
    void loadSessions();
  }, []);

  // 新規セッションを作成し、自動生成されたIDを返す
  const createSession = async (): Promise<string | null> => {
    const { data, errors } = await client.models.ChatSession.create({
      projectId,
      name: `会話 - ${new Date().toLocaleString("ja-JP")}`,
    });

    if (errors || !data?.id) {
      console.error("Session create error", errors);
      return null;
    }

    await loadSessions();
    return data.id;
  };

  // セッション削除時に配下メッセージを先に削除して整合性を保つ
  const deleteSession = async (sessionId: string) => {
    let varNextToken: string | null | undefined;
    const allMessages: Array<{ id: string }> = [];

    do {
      const { data, errors, nextToken } =
        await client.models.ChatMessage.listChatMessageBySessionId(
          { sessionId },
          {
            limit: 1000,
            nextToken: varNextToken ?? undefined,
          }
        );

      if (errors) {
        console.error("Message list error", errors);
        return;
      }

      allMessages.push(...(data ?? []));
      varNextToken = nextToken;
    } while (varNextToken);

    for (const message of allMessages) {
      const { errors } = await client.models.ChatMessage.delete({
        id: message.id,
      });

      if (errors) {
        console.error("Message delete error", errors);
        return;
      }
    }

    const { errors } = await client.models.ChatSession.delete({
      id: sessionId,
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
