import type { Schema } from "@workops/data-schema";

// スキーマから型を取得
export type CognitoUserType = Schema["CognitoUser"]["type"];
export type UserDetailType = Schema["UserDetail"]["type"];
export type CognitoGroupType = Schema["CognitoGroup"]["type"];

// ミューテーション引数型
export type CreateUserArguments = Schema["createUser"]["args"];
export type SetUserEnabledArguments = Schema["setUserEnabled"]["args"];
export type DeleteUserArguments = Schema["deleteUser"]["args"];
export type AddUserToGroupArguments = Schema["addUserToGroup"]["args"];
export type RemoveUserFromGroupArguments = Schema["removeUserFromGroup"]["args"];
