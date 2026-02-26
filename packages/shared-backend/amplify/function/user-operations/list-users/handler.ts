import {
  CognitoIdentityProviderClient,
  ListUsersCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import type { Schema } from "../../../data/resource";
import { env } from "$amplify/env/listUsers";

const cognitoClient = new CognitoIdentityProviderClient({
  region: process.env.AWS_REGION,
});

// スキーマから出力型を取得
type CognitoUser = Schema["CognitoUser"]["type"];
// スキーマからハンドラー型を取得
type ListUsersHandler = Schema["listUsers"]["functionHandler"];

export const handler: ListUsersHandler = async (event) => {
  console.log("Function to list users started", JSON.stringify(event));

  const allUsers: CognitoUser[] = [];
  let paginationToken: string | undefined;

  do {
    // フィルタリングなしで全ユーザーを取得（上限60ずつ）
    const command = new ListUsersCommand({
      UserPoolId: env.USER_POOL_ID,
      Limit: 60,
      PaginationToken: paginationToken,
    });

    const response = await cognitoClient.send(command);

    if (response.Users) {
      const usersBatch = response.Users.map((user) => ({
        username: user.Username || "",
        email: user.Attributes?.find((attr) => attr.Name === "email")?.Value,
        status: user.UserStatus,
        enabled: user.Enabled,
        createdDate: user.UserCreateDate?.toISOString(),
        lastModifiedDate: user.UserLastModifiedDate?.toISOString(),
        // groups関連は削除
      }));
      allUsers.push(...usersBatch);
    }

    paginationToken = response.PaginationToken;
  } while (paginationToken);

  console.log(`Found ${allUsers.length} users totally`);
  return allUsers;
};
