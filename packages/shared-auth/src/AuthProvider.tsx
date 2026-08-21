import { useState, useEffect, type ReactNode } from "react";
import {
  getCurrentUser,
  fetchAuthSession,
  signInWithRedirect,
  signOut as cognitoSignOut,
} from "aws-amplify/auth";
import { Hub } from "aws-amplify/utils";
import { useNotification } from "@workops-suite/shared-notification";
import { AuthContext, type UserInfo, getWorkopsRoleValues } from "./types";

let redirectFailed = false;

// 現在のURLがAmplifyのOAuth戻り先かを判定する。
const isOAuthCallback = () => {
  const searchParameters = new URL(window.location.href).searchParams;
  return searchParameters.has("code") || searchParameters.has("error");
};

// OAuth callbackを通常の未認証アクセスとして再処理しないようURLを戻す。
const clearOAuthRedirect = () => {
  window.history.replaceState(
    window.history.state,
    "",
    `${window.location.origin}/`,
  );
};

// Amplify設定前のmodule読込時にOAuth結果を購読し、認証前のpathと失敗を保持する。
Hub.listen("auth", ({ payload }) => {
  if (payload.event === "customOAuthState") {
    const target = new URL(payload.data, window.location.origin);
    if (target.origin === window.location.origin) {
      window.history.replaceState(
        window.history.state,
        "",
        `${target.pathname}${target.search}${target.hash}`,
      );
    }
    return;
  }

  if (payload.event === "signInWithRedirect_failure") {
    console.error("OAuth認証に失敗しました:", payload.data.error);
    redirectFailed = true;
    clearOAuthRedirect();
    return;
  }

  if (payload.event === "signedIn") {
    redirectFailed = false;
  }
});

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [userInfo, setUserInfo] = useState<UserInfo>({
    isAuthenticated: false,
  });
  const [isLoading, setIsLoading] = useState(true);
  const { showSuccess, showError } = useNotification();
  const [error, setError] = useState("");

  // Cognitoの認証情報を画面で利用する形へ変換する。
  const fetchUserInfo = async () => {
    setIsLoading(true);
    setError("");
    try {
      const [user, session] = await Promise.all([
        getCurrentUser(),
        fetchAuthSession(),
      ]);
      // IDトークン、アクセストークンから情報を取得
      const idToken = session.tokens?.idToken?.toString();
      const idTokenPayload = session.tokens?.idToken?.payload;
      const accessToken = session.tokens?.accessToken?.payload;
      const groupClaim = accessToken?.["cognito:groups"];
      const groups = Array.isArray(groupClaim)
        ? groupClaim.filter((group) => typeof group === "string")
        : [];

      // pre-token-generation で埋め込まれたカスタムClaimsを取得
      // スキーマEnumに含まれるロールのみ採用する
      const rawRole = idTokenPayload?.["workops_role"];
      const roleValues = getWorkopsRoleValues();
      const role = roleValues.find((value) => value === rawRole);
      const departmentCodeClaim = idTokenPayload?.["workops_department_code"];
      const departmentCode =
        typeof departmentCodeClaim === "string"
          ? departmentCodeClaim
          : undefined;
      const departmentNameClaim = idTokenPayload?.["workops_department_name"];
      const departmentName =
        typeof departmentNameClaim === "string"
          ? departmentNameClaim
          : undefined;
      const isGlobalAdmin = idTokenPayload?.["workops_is_global_admin"] === "true";

      setUserInfo({
        isAuthenticated: true,
        username: user.username,
        userId: user.userId,
        identityId: session.identityId,
        groups,
        idToken,
        isGlobalAdmin,
        role,
        departmentCode,
        departmentName,
      });
    } catch (error) {
      setUserInfo({ isAuthenticated: false });

      if (redirectFailed || isOAuthCallback()) {
        clearOAuthRedirect();
        setError("認証に失敗しました。");
        return;
      }

      if (
        !(error instanceof Error) ||
        error.name !== "UserUnAuthenticatedException"
      ) {
        console.error("認証情報の取得に失敗しました:", error);
        setError("認証情報の取得に失敗しました。");
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Cognitoのglobal sign-outを行い、全端末のsessionを無効化する。
  const signOut = async () => {
    try {
      const redirectUrl = `${window.location.origin}/`;
      await cognitoSignOut({
        global: true,
        oauth: { redirectUrl },
      });

      setError("");
      // 画面遷移するので通知は見えないかもしれないが呼び出しておく
      showSuccess("ログアウトしました");
    } catch (error) {
      const errorMessage = `ログアウトに失敗しました: ${
        error instanceof Error ? error.message : String(error)
      }`;
      setError(errorMessage);

      // ログアウトエラー通知
      console.error("ログアウトに失敗しました:", error);
      showError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  useEffect(() => {
    // 認証済み画面でtoken更新に失敗した場合も、固定の認証失敗画面へ遷移する。
    return Hub.listen("auth", ({ payload }) => {
      if (payload.event !== "tokenRefresh_failure") {
        return;
      }

      console.error("認証tokenの更新に失敗しました:", payload.data.error);
      setUserInfo({ isAuthenticated: false });
      setError("認証に失敗しました。");
      setIsLoading(false);
    });
  }, []);

  useEffect(() => {
    void fetchUserInfo();
  }, []);

  useEffect(() => {
    // 認証情報の確認後に未認証だった場合だけ、認証前pathを保持してloginを開始する。
    if (isLoading || userInfo.isAuthenticated || error) {
      return;
    }

    const signInPath = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    void signInWithRedirect({
      customState: signInPath,
      options: { lang: "ja" },
    }).catch((redirectError) => {
      console.error("認証画面への遷移に失敗しました:", redirectError);
      setError("認証画面への遷移に失敗しました。");
    });
  }, [error, isLoading, userInfo.isAuthenticated]);

  const value = {
    userInfo,
    isLoading,
    error,
    signOut,
  };

  // 認証状態が確定するまではアプリ本体を描画しない
  if (isLoading) {
    return null;
  }

  if (error) {
    return (
      <div>
        <p>{error}</p>
      </div>
    );
  }

  // 未認証時はリダイレクトのみ行い、画面は表示しない
  if (!userInfo.isAuthenticated) {
    return null;
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
