import {
  AdminCreateUserCommand,
  AttributeType,
  CognitoIdentityProviderClient,
} from "@aws-sdk/client-cognito-identity-provider";
import type { Schema } from "../../../data/resource";
import { env } from "$amplify/env/createUser";

const cognitoClient = new CognitoIdentityProviderClient({
  region: process.env.AWS_REGION,
});

// スキーマからハンドラー型を取得
type CreateUserHandler = Schema["createUser"]["functionHandler"];

export const handler: CreateUserHandler = async (event) => {
  console.log("Function to create user started", JSON.stringify(event));

  const { username, email } = event.arguments;

  // ユーザー属性の設定
  const userAttributeList: AttributeType[] = [
    {
      Name: "email",
      Value: email,
    },
    {
      Name: "email_verified",
      Value: "true",
    },
    // ユーザー名を表示名としても使用
    {
      Name: "name",
      Value: username,
    },
  ];

  // ユーザー作成コマンドの設定
  const createUserCommand = new AdminCreateUserCommand({
    UserPoolId: env.USER_POOL_ID,
    Username: username,
    UserAttributes: userAttributeList,
  });

  // ユーザーを作成
  const createUserResponse = await cognitoClient.send(createUserCommand);
  console.log("User created successfully:", createUserResponse.User?.Username);

  // 作成したユーザー情報を返却
  return {
    username,
    email,
    status: createUserResponse.User?.UserStatus,
    enabled: createUserResponse.User?.Enabled,
    createdDate: createUserResponse.User?.UserCreateDate?.toISOString(),
  };
};
