import { useEffect, useState } from "react";
import { fetchAuthSession } from "aws-amplify/auth";
import { z } from "zod";
import type { Session } from "../types";
import { useChatBotConfig } from "../context/ChatBotConfigContext";

// Managed Memoryから返るsession一覧のJSON形状を検証する。
const sessionsSchema = z.object({
  sessions: z.array(
    z.object({
      id: z.string(),
      createdAt: z.string(),
    }),
  ),
});

// 作成日時だけを正本にしてsessionの表示名を生成する。
function sessionName(createdAt: string): string {
  return `会話 ${new Date(createdAt).toLocaleString("ja-JP")}`;
}

// API Gatewayのbase URLとresource pathを結合する。
function apiUrl(url: string, path: string): string {
  return `${url.replace(/\/$/, "")}${path}`;
}

// Cognito sessionからBFFへ渡すaccess tokenを取得する。
async function accessToken(): Promise<string> {
  const session = await fetchAuthSession();
  const token = session.tokens?.accessToken?.toString();
  if (!token) {
    throw new Error("Cognito access token is unavailable");
  }
  return token;
}

// Managed Memoryのsession一覧、作成、削除を提供する。
export function useSessions() {
  const { agentRestApiUrl } = useChatBotConfig();
  const [sessions, setSessions] = useState<Session[]>([]);

  useEffect(() => {
    void (async () => {
      try {
        const token = await accessToken();
        const response = await fetch(apiUrl(agentRestApiUrl, "/chat/sessions"), {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) {
          throw new Error("Session list failed");
        }
        const result = sessionsSchema.parse(JSON.parse(await response.text()));
        const loadedSessions = result.sessions.map((session) => ({
          ...session,
          name: sessionName(session.createdAt),
        }));
        const loadedIds = new Set(
          loadedSessions.map((session) => session.id),
        );
        // 一覧取得中に画面で作成した未保存sessionを残す。
        setSessions((currentSessions) => [
          ...currentSessions.filter((session) => !loadedIds.has(session.id)),
          ...loadedSessions,
        ]);
      } catch (error) {
        console.error("Session list error", error);
      }
    })();
  }, [agentRestApiUrl]);

  const createSession = (): string => {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    setSessions((currentSessions) => [
      {
        id,
        name: sessionName(now),
        createdAt: now,
      },
      ...currentSessions,
    ]);
    return id;
  };

  const deleteSession = async (sessionId: string) => {
    try {
      const token = await accessToken();
      const response = await fetch(
        apiUrl(agentRestApiUrl, `/chat/sessions/${sessionId}`),
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      if (!response.ok) {
        throw new Error("Session delete failed");
      }
      setSessions((currentSessions) =>
        currentSessions.filter((session) => session.id !== sessionId),
      );
    } catch (error) {
      console.error("Session delete error", error);
      throw error;
    }
  };

  return { sessions, createSession, deleteSession };
}
