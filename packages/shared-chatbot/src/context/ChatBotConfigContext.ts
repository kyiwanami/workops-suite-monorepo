import { createContext, useContext } from "react";

export interface ChatBotConfig {
  /** Cognitoで認証されたBrowserが接続するChat API URL */
  agentRestApiUrl: string;
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
