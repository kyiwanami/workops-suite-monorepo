import { useEffect, useState } from "react";
import { generateClient } from "aws-amplify/data";
import { fetchAuthSession } from "aws-amplify/auth";
import { v4 as uuidv4 } from "uuid";
import type { Schema } from "@workops/data-schema";
import type { Message } from "../types";
import { processTraces } from "../utils";
import { useChatBotConfig } from "../context/ChatBotConfigContext";

const client = generateClient<Schema>();
const PAGE_SIZE = 10;

// ファイル制限定数
export const SUPPORTED_FILE_EXTENSIONS = [
  ".pdf",
  ".csv",
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
  ".html",
  ".txt",
  ".md",
];
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

interface AgentCoreResult {
  answer: string;
  traces?: string | null;
}

export function useChatBot(sessionId: string) {
  const { appId, agentCoreUrl, userInfo } = useChatBotConfig();
  const [messages, setMessages] = useState<Message[]>([]);
  const [nextToken, setNextToken] = useState<string | null | undefined>(
    undefined,
  );
  const [loading, setLoading] = useState(false);

  // メッセージ取得は新しい順で取り、UI表示用に反転する
  const loadMessages = async (token?: string) => {
    setLoading(true);

    const {
      data,
      errors,
      nextToken: newNextToken,
    } = await client.models.ChatMessage.listChatMessageBySessionId(
      { sessionId },
      {
        sortDirection: "DESC",
        limit: PAGE_SIZE,
        nextToken: token,
      }
    );

    if (errors) {
      console.error("Message list error", errors);
      setLoading(false);
      return;
    }

    const processedItems: Message[] = (data ?? []).map((item) => ({
      id: item.id,
      role: item.role,
      content: item.content,
      traces: item.traces ? processTraces(item.traces) : undefined,
      createdAt: item.createdAt ?? "",
    }));

    const reversedChunk = processedItems.reverse();

    setMessages((prev) => {
      if (!token) {
        return reversedChunk;
      }
      return [...reversedChunk, ...prev];
    });

    setNextToken(newNextToken ?? undefined);
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

    const { errors: userMessageErrors } =
      await client.models.ChatMessage.create({
        sessionId,
        appId,
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

    const { errors: userSessionUpdateErrors } =
      await client.models.ChatSession.update({
        id: sessionId,
      });

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

    // 認証コンテキストからユーザー情報（sub/部署コード）を取得
    // TODO: チャット経由のレビュー操作では approverSub / rejectionReason / returnReason の安全な保存をまだ行わない。
    const requesterSub = userInfo.userId;
    const departmentId = userInfo.departmentCode ?? "";

    if (!requesterSub) {
      console.error("User info does not contain userId");
      pushErrorMessage();
      setLoading(false);
      return;
    }
    if (!departmentId) {
      console.warn("User info does not contain departmentCode");
    }

    console.log("AgentCore Direct Invocation:");
    console.log("  URL:", agentCoreUrl);
    console.log("  Access Token:", accessToken.substring(0, 20) + "...");
    console.log("  Requester Sub:", requesterSub);
    console.log("  Department ID:", departmentId);

    // TODO: 監査ログは現時点で UI 経路のみ記録し、チャット経由の操作には付与しない。
    // 申請作成に必要なユーザー文脈をqueryへ連結して送信する
    const queryWithUserContext = `${query}

申請者のID（Cognito sub）: ${requesterSub}
所属部門コード: ${departmentId}`;

    let result: AgentCoreResult | null = null;
    try {
      const response = await fetch(agentCoreUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: queryWithUserContext,
          sessionId,
          attachments,
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
    const aiAnswer = result.answer;
    const aiMsg: Message = {
      id: aiMessageId,
      role: "assistant",
      content: aiAnswer,
      traces: result.traces ? processTraces(result.traces) : undefined,
      createdAt: aiCreatedAt,
    };
    setMessages((prev) => [...prev, aiMsg]);

    const { errors: aiMessageErrors } = await client.models.ChatMessage.create({
      sessionId,
      appId,
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

    const { errors: aiSessionUpdateErrors } =
      await client.models.ChatSession.update({
        id: sessionId,
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
