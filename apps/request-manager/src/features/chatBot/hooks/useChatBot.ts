import { useEffect, useState } from "react";
import { generateClient } from "aws-amplify/data";
import { fetchAuthSession } from "aws-amplify/auth";
import { jwtDecode, type JwtPayload } from "jwt-decode";
import { DocumentFormat } from "@aws-sdk/client-bedrock-runtime";
import { v4 as uuidv4 } from "uuid";
import type { Schema } from "@workops/data-schema";
import type { Message } from "../types";
import { processTraces } from "../utils";
import packageJson from "../../../../package.json";
import outputs from "../../../../amplify_outputs.json";

const client = generateClient<Schema>();
const PAGE_SIZE = 10;
const CHAT_PROJECT_ID = packageJson.name;

// ファイル制限定数
export const SUPPORTED_FILE_EXTENSIONS = Object.values(DocumentFormat).map(
  (ext) => `.${ext}`,
);
export const MAX_FILE_SIZE_MB = 4;
export const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
export const MAX_FILE_COUNT = 5;

/**
 * ファイルのバリデーション
 */
export function validateFiles(files: File[]): string | null {
  if (files.length > MAX_FILE_COUNT) {
    return `最大${MAX_FILE_COUNT}ファイルまでアップロード可能です。`;
  }
  for (const file of files) {
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return `ファイル「${file.name}」が${MAX_FILE_SIZE_MB}MBを超えています。`;
    }
    const ext = `.${file.name.split(".").pop()?.toLowerCase()}`;
    if (!SUPPORTED_FILE_EXTENSIONS.includes(ext)) {
      return `ファイル「${file.name}」の形式はサポートされていません。`;
    }
  }
  return null;
}

export interface Attachment {
  name: string;
  base64: string;
}

export function useChatBot(sessionId: string) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [nextToken, setNextToken] = useState<string | null | undefined>(
    undefined,
  );
  const [loading, setLoading] = useState(false);

  // メッセージ取得は新しい順で取り、UI表示用に反転する
  const loadMessages = async (token?: string) => {
    setLoading(true);

    const { data, errors } = await client.queries.listMessages({
      projectId: CHAT_PROJECT_ID,
      sessionId,
      direction: "DESC",
      limit: PAGE_SIZE,
      nextToken: token,
    });

    if (errors) {
      console.error("Message list error", errors);
      setLoading(false);
      return;
    }

    const processedItems: Message[] = (data?.items ?? []).map((item) => ({
      id: item.messageId,
      role: item.role,
      content: item.content,
      traces: item.traces ? processTraces(item.traces) : undefined,
      createdAt: item.createdAt,
    }));

    const reversedChunk = processedItems.reverse();

    setMessages((prev) => {
      if (!token) {
        return reversedChunk;
      }
      return [...reversedChunk, ...prev];
    });

    setNextToken(data?.nextToken ?? undefined);
    setLoading(false);
  };

  useEffect(() => {
    setMessages([]);
    setNextToken(undefined);

    if (!sessionId) {
      return;
    }

    void loadMessages(undefined);
  }, [sessionId]);

  const loadMore = () => {
    if (nextToken) {
      void loadMessages(nextToken);
    }
  };

  // AgentCore Runtime直接呼び出し
  const sendMessage = async (query: string, attachments?: Attachment[]) => {
    if (!query || !sessionId) {
      return;
    }

    setLoading(true);

    const pushErrorMessage = () => {
      setMessages((prev) => [
        ...prev,
        {
          id: uuidv4(),
          role: "assistant",
          content: "エラーが発生しました。詳細はコンソールを確認してください。",
          createdAt: new Date().toISOString(),
        },
      ]);
    };

    // Session存在確認して未作成なら作る
    const { data: sessionData, errors: sessionGetErrors } =
      await client.queries.getSession({
        projectId: CHAT_PROJECT_ID,
        sessionId,
      });

    if (sessionGetErrors) {
      console.error("Session.get errors:", sessionGetErrors);
      pushErrorMessage();
      setLoading(false);
      return;
    }

    if (!sessionData) {
      const { errors: sessionCreateErrors } = await client.mutations.createSession(
        {
          projectId: CHAT_PROJECT_ID,
          sessionId,
          name: `会話 - ${new Date().toLocaleString("ja-JP")}`,
        },
      );

      if (sessionCreateErrors) {
        console.error("Session.create errors:", sessionCreateErrors);
        pushErrorMessage();
        setLoading(false);
        return;
      }
    }

    // User Message作成（楽観的UI更新）
    const userMessageId = uuidv4();
    const userCreatedAt = new Date().toISOString();
    const optimisticMsg: Message = {
      id: userMessageId,
      role: "user",
      content: query,
      createdAt: userCreatedAt,
    };
    setMessages((prev) => [...prev, optimisticMsg]);

    const { errors: userMessageErrors } = await client.mutations.createMessage({
      projectId: CHAT_PROJECT_ID,
      sessionId,
      messageId: userMessageId,
      role: "user",
      content: query,
      traces: null,
    });

    if (userMessageErrors) {
      console.error("User Message.create errors:", userMessageErrors);
      pushErrorMessage();
      setLoading(false);
      return;
    }

    const { errors: userSessionUpdateErrors } = await client.mutations.updateSession(
      {
        projectId: CHAT_PROJECT_ID,
        sessionId,
      },
    );

    if (userSessionUpdateErrors) {
      console.error("Session.update errors:", userSessionUpdateErrors);
      pushErrorMessage();
      setLoading(false);
      return;
    }

    // Cognito Access Token取得
    const session = await fetchAuthSession();
    const accessToken = session.tokens?.accessToken?.toString();

    if (!accessToken) {
      console.error("Access Tokenが取得できませんでした");
      pushErrorMessage();
      setLoading(false);
      return;
    }

    // JWTからactorId（User Sub）を抽出
    const decoded = jwtDecode<JwtPayload>(accessToken);
    const actorId = decoded.sub;

    if (!actorId) {
      console.error("JWT token does not contain sub claim");
      pushErrorMessage();
      setLoading(false);
      return;
    }

    // AgentCore Runtime ARNから実行時にInvokeAgentRuntime URLを組み立てる
    const runtimeArn = outputs.custom.agentCoreRuntimeArn;
    const region = outputs.auth.aws_region;
    const url = `https://bedrock-agentcore.${region}.amazonaws.com/runtimes/${encodeURIComponent(runtimeArn)}/invocations`;

    console.log("AgentCore Direct Invocation:");
    console.log("  URL:", url);
    console.log("  Access Token:", accessToken.substring(0, 20) + "...");
    console.log("  Actor ID:", actorId);

    let result: { answer?: string; traces?: string | null } | null = null;
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query,
          sessionId,
          actorId,
          attachments,
          sessionState: {
            promptSessionAttributes: {
              mode: "chat",
            },
          },
        }),
      });

      console.log("  Response Status:", response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("  Response Error:", errorText);
        pushErrorMessage();
        setLoading(false);
        return;
      }

      result = await response.json();
      console.log("  Response Data:", result);
    } catch (error) {
      pushErrorMessage();
      console.error("AgentCore Direct Invocation Error:", error);
      setLoading(false);
      return;
    }

    if (!result) {
      pushErrorMessage();
      setLoading(false);
      return;
    }

    // AI Message作成
    const aiMessageId = uuidv4();
    const aiCreatedAt = new Date().toISOString();
    const aiAnswer = result.answer || "回答を生成できませんでした";
    const aiMsg: Message = {
      id: aiMessageId,
      role: "assistant",
      content: aiAnswer,
      traces: result.traces ? processTraces(result.traces) : undefined,
      createdAt: aiCreatedAt,
    };
    setMessages((prev) => [...prev, aiMsg]);

    const { errors: aiMessageErrors } = await client.mutations.createMessage({
      projectId: CHAT_PROJECT_ID,
      sessionId,
      messageId: aiMessageId,
      role: "assistant",
      content: aiAnswer,
      traces: result.traces ? JSON.stringify(result.traces) : undefined,
    });

    if (aiMessageErrors) {
      console.error("AI Message.create errors:", aiMessageErrors);
      pushErrorMessage();
      setLoading(false);
      return;
    }

    const { errors: aiSessionUpdateErrors } = await client.mutations.updateSession({
      projectId: CHAT_PROJECT_ID,
      sessionId,
    });

    if (aiSessionUpdateErrors) {
      console.error("Session.update errors:", aiSessionUpdateErrors);
      pushErrorMessage();
      setLoading(false);
      return;
    }

    setLoading(false);
  };

  return {
    messages,
    loading,
    sendMessage,
    loadMore,
    hasMore: !!nextToken,
    validateFiles,
  };
}



