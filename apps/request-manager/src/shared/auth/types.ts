import { createContext } from "react";
import type { Schema } from "@workops/data-schema";
import { generateClient } from "aws-amplify/data";
import type { MongoAbility } from "@casl/ability";

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
  error: string | null;
  signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(
  undefined
);

export type AppAction =
  | "read"
  | "create"
  | "update"
  | "submit"
  | "withdraw"
  | "approve"
  | "reject"
  | "return"
  | "delete"
  | "manage";
export type AppSubject =
  | "RequestPage"
  | "RequestTypePage"
  | "RequestTypeMenu"
  | "Request"
  | "RequestType"
  | Schema["Request"]["type"]
  | Schema["RequestType"]["type"];

export type AppAbility = MongoAbility<[AppAction, AppSubject]>;
