import {
  CognitoIdentityProviderClient,
  AdminDeleteUserCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import { type Schema } from "../../../data/resource";
import { env } from "$amplify/env/deleteUser";

const cognitoClient = new CognitoIdentityProviderClient({
  region: process.env.AWS_REGION,
});

// スキーマからハンドラー型を取得
type DeleteUserHandler = Schema["deleteUser"]["functionHandler"];

export const handler: DeleteUserHandler = async (event) => {
  console.log("Function to delete user started", {
    username: event.arguments.username,
  });

  const { username } = event.arguments;

  // ユーザー削除コマンドを実行
  const deleteCommand = new AdminDeleteUserCommand({
    UserPoolId: env.USER_POOL_ID,
    Username: username,
  });

  await cognitoClient.send(deleteCommand);

  // 削除されたユーザー名を返却
  return username;
};
