import { BrowserRouter } from "react-router-dom";
import { GlobalStyles } from "@mui/material";
import { useMemo } from "react";
import {
  AuthProvider,
  useAuth,
} from "@workops-suite/shared-auth";
import { NotificationProvider } from "@workops-suite/shared-notification";
import { AbilityContext, buildAppAbility } from "./shared/auth/ability";
import AppRoutes from "./app/Routes";
import { ChatBotProvider, ChatWidget } from "@workops-suite/shared-chatbot";
import outputs from "../../../packages/shared-backend/amplify_outputs.json";

const region = outputs.auth.aws_region;
const runtimeArn = outputs.custom.agentCoreRuntimeArn;
const agentCoreUrl = `https://bedrock-agentcore.${region}.amazonaws.com/runtimes/${encodeURIComponent(runtimeArn)}/invocations`;

const AuthorizedApp = () => {
  const { userInfo } = useAuth();
  // 認証済みユーザー情報を使って Ability を生成し、配下UIに配布する
  const ability = useMemo(() => buildAppAbility(userInfo), [userInfo]);

  return (
    <ChatBotProvider
      config={{
        projectId: "@workops-suite/request-manager",
        agentCoreUrl,
        userInfo,
        title: "Todo チャット",
      }}
    >
      <AbilityContext.Provider value={ability}>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AbilityContext.Provider>
      <ChatWidget />
    </ChatBotProvider>
  );
};

export default function App() {
  return (
    <>
      {/* Amplify のグローバル body スタイルを上書きし、アプリ全体のスクロール挙動と余白を制御する */}
      <GlobalStyles
        styles={{
          body: {
            margin: 0,
            minHeight: "100%",
          },
        }}
      />
      <NotificationProvider>
        <AuthProvider>
          <AuthorizedApp />
        </AuthProvider>
      </NotificationProvider>
    </>
  );
}
