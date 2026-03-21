import { createContext, useContext } from "react";

export interface ChatBotUserInfo {
  userId?: string;
  departmentCode?: string;
}

export interface ChatBotConfig {
  /** セッションのフィルターキー（旧: packageJson.name） */
  projectId: string;
  /** AgentCore エンドポイント URL */
  agentCoreUrl: string;
  /** 認証情報（アプリ側で useAuth() を呼んで渡す） */
  userInfo: ChatBotUserInfo;
  /** チャットウィジェットのデフォルトタイトル */
  title?: string;
}

export const ChatBotConfigContext = createContext<ChatBotConfig | undefined>(
  undefined
);

export function useChatBotConfig(): ChatBotConfig {
  const context = useContext(ChatBotConfigContext);
  if (context === undefined) {
    throw new Error(
      "useChatBotConfig must be used within a ChatBotProvider"
    );
  }
  return context;
}
