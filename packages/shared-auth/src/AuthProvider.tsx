import { useState, useEffect, useRef, type ReactNode } from "react";
import {
  getCurrentUser,
  fetchAuthSession,
  signInWithRedirect,
  signOut as cognitoSignOut,
} from "aws-amplify/auth";
import { Hub } from "aws-amplify/utils";
import { useNotification } from "@workops-suite/shared-notification";
import { AuthContext, type UserInfo, getWorkopsRoleValues } from "./types";

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [userInfo, setUserInfo] = useState<UserInfo>({
    isAuthenticated: false,
  });
  const [isLoading, setIsLoading] = useState(true);
  const { showSuccess, showError } = useNotification();
  const [error, setError] = useState<string | null>(null);
  const oauthRedirectFailedRef = useRef(false);

  const normalizeError = (input: unknown) => {
    return input instanceof Error ? input : new Error(String(input));
  };

  const fetchUserInfo = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [user, session] = await Promise.all([
        getCurrentUser(),
        fetchAuthSession(),
      ]);
      oauthRedirectFailedRef.current = false;

      // IDトークン、アクセストークンから情報を取得
      const idToken = session.tokens?.idToken?.toString();
      const idTokenPayload = session.tokens?.idToken?.payload;
      const accessToken = session.tokens?.accessToken?.payload;
      const groups = (accessToken?.["cognito:groups"] as string[]) || [];

      // pre-token-generation で埋め込まれたカスタムClaimsを取得
      // スキーマEnumに含まれるロールのみ採用する
      const rawRole = idTokenPayload?.["workops_role"];
      const roleValues = getWorkopsRoleValues();
      const role = roleValues.find((value) => value === rawRole);
      const departmentCode = idTokenPayload?.[
        "workops_department_code"
      ] as string | undefined;
      const departmentName = idTokenPayload?.[
        "workops_department_name"
      ] as string | undefined;
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
      const normalizedError = normalizeError(error);
      const errorName = normalizedError.name;
      setUserInfo({ isAuthenticated: false });

      if (errorName !== "UserUnAuthenticatedException") {
        console.warn("認証情報の取得に失敗しました:", normalizedError);
        setError("認証情報の取得に失敗しました。");
        return;
      }

      // OAuthコールバック失敗後は再リダイレクトを止めてエラー表示に固定する
      if (oauthRedirectFailedRef.current) {
        console.warn("認証情報の取得に失敗しました:", normalizedError);
        setError("認証情報の取得に失敗しました。");
        return;
      }

      try {
        await signInWithRedirect({ options: { lang: "ja" } });
      } catch (redirectError) {
        const normalizedRedirectError = normalizeError(redirectError);
        console.warn("認証画面への遷移に失敗しました:", normalizedRedirectError);
        setError("認証画面への遷移に失敗しました。");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    try {
      const redirectUrl = `${window.location.origin}/`;
      await cognitoSignOut({
        global: true,
        oauth: { redirectUrl },
      });

      setError(null);
      // 画面遷移するので通知は見えないかもしれないが呼び出しておく
      showSuccess("ログアウトしました");
    } catch (error) {
      const errorMessage = `ログアウトに失敗しました: ${
        error instanceof Error ? error.message : String(error)
      }`;
      setError(errorMessage);

      // ログアウトエラー通知
      showError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  useEffect(() => {
    const stopAuthHubListener = Hub.listen("auth", ({ payload }) => {
      if (payload.event === "signInWithRedirect_failure") {
        oauthRedirectFailedRef.current = true;
        return;
      }
      if (payload.event === "signedIn") {
        oauthRedirectFailedRef.current = false;
      }
    });

    return () => {
      stopAuthHubListener();
    };
  }, []);

  useEffect(() => {
    fetchUserInfo();
  }, []);

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
