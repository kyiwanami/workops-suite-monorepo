import type { ReactNode } from "react";
import {
  ChatBotConfigContext,
  type ChatBotConfig,
} from "../context/ChatBotConfigContext";

interface ChatBotProviderProps {
  config: ChatBotConfig;
  children: ReactNode;
}

export function ChatBotProvider({ config, children }: ChatBotProviderProps) {
  return (
    <ChatBotConfigContext.Provider value={config}>
      {children}
    </ChatBotConfigContext.Provider>
  );
}
