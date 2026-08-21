import { useEffect, useState } from "react";
import { fetchAuthSession } from "aws-amplify/auth";
import { z } from "zod";
import type { Message } from "../types";
import { useChatBotConfig } from "../context/ChatBotConfigContext";

// Managed Memoryから返る会話履歴のJSON形状を検証する。
const messageListSchema = z
  .object({
    messages: z.array(
      z
        .object({
          id: z.string(),
          role: z.enum(["user", "assistant"]),
          content: z.string(),
          createdAt: z.string(),
        })
        .strict(),
    ),
  })
  .strict();

// BFF以外の失敗は内部情報を含まない固定文に置き換える。
const SAFE_ERROR_MESSAGE =
  "処理を完了できませんでした。時間をおいてもう一度お試しください。";

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

// Fetch APIのraw text streamをUTF-8文字列として逐次通知する。
async function readChatStream(
  response: Response,
  onText: (text: string) => void,
): Promise<void> {
  if (!response.body) {
    throw new Error("Agent response stream is unavailable");
  }
  const contentType = response.headers.get("Content-Type");
  if (!contentType?.toLowerCase().startsWith("text/plain")) {
    throw new Error("Agent response content type is invalid");
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  while (true) {
    // TextDecoderのstream modeで、UTF-8文字がchunk境界で分かれても復元する。
    const chunk = await reader.read();
    if (chunk.done) {
      const tail = decoder.decode();
      if (tail) {
        onText(tail);
      }
      return;
    }
    const text = decoder.decode(chunk.value, { stream: true });
    if (text) {
      onText(text);
    }
  }
}

// 会話履歴の取得と、assistant回答の逐次描画を提供する。
export function useChatBot(sessionId: string) {
  const { agentRestApiUrl } = useChatBotConfig();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  const sendMessage = async (query: string) => {
    if (!query || !sessionId) {
      return;
    }

    setLoading(true);
    let token: string;
    try {
      token = await accessToken();
    } catch (error) {
      console.error("Agent access token error", error);
      setMessages((currentMessages) => [
        ...currentMessages,
        {
          id: crypto.randomUUID(),
          role: "user",
          content: query,
          createdAt: new Date().toISOString(),
        },
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: SAFE_ERROR_MESSAGE,
          createdAt: new Date().toISOString(),
        },
      ]);
      setLoading(false);
      return;
    }

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: query,
      createdAt: new Date().toISOString(),
    };
    const assistantId = crypto.randomUUID();
    setMessages((currentMessages) => [
      ...currentMessages,
      userMessage,
      {
        id: assistantId,
        role: "assistant",
        content: "",
        createdAt: new Date().toISOString(),
      },
    ]);

    try {
      const response = await fetch(
        apiUrl(agentRestApiUrl, `/chat/sessions/${sessionId}/messages`),
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ query }),
        },
      );
      if (!response.ok) {
        throw new Error("Agent response failed");
      }

      await readChatStream(response, (text) => {
        setMessages((currentMessages) =>
          currentMessages.map((message) =>
            message.id === assistantId
              ? { ...message, content: `${message.content}${text}` }
              : message,
          ),
        );
      });
    } catch (error) {
      console.error("Agent message error", error);
      setMessages((currentMessages) =>
        currentMessages.map((message) =>
          message.id === assistantId
            ? { ...message, content: SAFE_ERROR_MESSAGE }
            : message,
        ),
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!sessionId) {
      setMessages([]);
      setLoading(false);
      return;
    }
    setMessages([]);
    setLoading(true);
    void (async () => {
      try {
        const token = await accessToken();
        const response = await fetch(
          apiUrl(agentRestApiUrl, `/chat/sessions/${sessionId}/messages`),
          { headers: { Authorization: `Bearer ${token}` } },
        );
        if (!response.ok) {
          throw new Error("Message list failed");
        }
        const result = messageListSchema.parse(
          JSON.parse(await response.text()),
        );
        setMessages(result.messages);
      } catch (error) {
        console.error("Message list error", error);
        setMessages([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [agentRestApiUrl, sessionId]);

  return {
    messages,
    loading,
    sendMessage,
  };
}
