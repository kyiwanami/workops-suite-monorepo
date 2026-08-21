import { createContext } from "react";
import type { Schema } from "@workops/data-schema";
import { generateClient } from "aws-amplify/data";

export type WorkopsRole = Schema["Role"]["type"];

// スキーマEnumからロール一覧を取得する
export const getWorkopsRoleValues = () => {
  const client = generateClient<Schema>();
  return client.enums.Role.values();
};

export interface UserInfo {
  isAuthenticated: boolean;
  username?: string;
  userId?: string;
  identityId?: string;
  groups?: string[];
  idToken?: string;
  // pre-token-generation で埋め込まれたカスタムClaims
  isGlobalAdmin?: boolean;
  role?: WorkopsRole;
  departmentCode?: string;
  departmentName?: string;
}

export interface AuthContextType {
  userInfo: UserInfo;
  isLoading: boolean;
  error: string;
  signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(
  undefined
);
