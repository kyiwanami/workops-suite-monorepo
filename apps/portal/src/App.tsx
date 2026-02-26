import { BrowserRouter } from "react-router-dom";
import { GlobalStyles } from "@mui/material";
import { useMemo } from "react";
import { NotificationProvider } from "./shared/notification";
import { AuthProvider } from "./shared/auth/AuthProvider";
import { useAuth } from "./shared/auth/useAuth";
import { AbilityContext, buildAppAbility } from "./shared/auth/ability";
import AppRoutes from "./app/Routes";

const AuthorizedApp = () => {
  const { userInfo } = useAuth();
  // 認証済みユーザー情報を使って Ability を生成し、配下UIに配布する
  const ability = useMemo(() => buildAppAbility(userInfo), [userInfo]);

  return (
    <AbilityContext.Provider value={ability}>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AbilityContext.Provider>
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
