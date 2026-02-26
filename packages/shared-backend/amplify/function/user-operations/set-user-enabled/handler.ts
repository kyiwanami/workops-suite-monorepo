import {
  CognitoIdentityProviderClient,
  AdminEnableUserCommand,
  AdminDisableUserCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import { type Schema } from "../../../data/resource";
import { env } from "$amplify/env/setUserEnabled";

const cognitoClient = new CognitoIdentityProviderClient({
  region: process.env.AWS_REGION,
});

// スキーマからハンドラー型を取得
type SetUserEnabledHandler = Schema["setUserEnabled"]["functionHandler"];

export const handler: SetUserEnabledHandler = async (event) => {
  console.log("Function to set user enabled status started", {
    username: event.arguments.username,
    enabled: event.arguments.enabled,
  });

  const { username, enabled } = event.arguments;

  // enabledパラメータに基づいて有効化または無効化コマンドを選択
  const command = enabled
    ? new AdminEnableUserCommand({
        UserPoolId: env.USER_POOL_ID,
        Username: username,
      })
    : new AdminDisableUserCommand({
        UserPoolId: env.USER_POOL_ID,
        Username: username,
      });

  await cognitoClient.send(command);

  // 処理されたユーザー名を返却
  return username;
};
