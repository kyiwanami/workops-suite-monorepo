import {
  CognitoIdentityProviderClient,
  AdminGetUserCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import type { Schema } from "../../../data/resource";
import { env } from "$amplify/env/getUser";

const cognitoClient = new CognitoIdentityProviderClient({
  region: process.env.AWS_REGION,
});

// スキーマから出力型を取得
type UserDetail = Schema["UserDetail"]["type"];

// スキーマからハンドラー型を取得
type GetUserHandler = Schema["getUser"]["functionHandler"];

export const handler: GetUserHandler = async (event) => {
  console.log("Function to get user started", {
    username: event.arguments.username,
  });

  const command = new AdminGetUserCommand({
    UserPoolId: env.USER_POOL_ID,
    Username: event.arguments.username,
  });

  const response = await cognitoClient.send(command);

  // ユーザーが存在しない場合はnullを返す
  if (!response.Username) {
    throw new Error(`User not found: ${event.arguments.username}`);
  }

  // ユーザー詳細情報を整理
  const userDetails: UserDetail = {
    username: response.Username,
    status: response.UserStatus,
    enabled: response.Enabled,
    createdDate: response.UserCreateDate?.toISOString(),
    lastModifiedDate: response.UserLastModifiedDate?.toISOString(),
    attributes:
      response.UserAttributes?.reduce(
        (acc, attr) => {
          if (attr.Name && attr.Value) {
            acc[attr.Name] = attr.Value;
          }
          return acc;
        },
        {} as Record<string, string>
      ) || {},
  };

  console.log(`User details retrieved for: ${event.arguments.username}`);
  return userDetails;
};
