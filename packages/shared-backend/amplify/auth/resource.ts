import { defineAuth } from "@aws-amplify/backend";
import type { BackendType } from "../backend";
import { Stack } from "aws-cdk-lib";
import { preTokenGenerationFunction } from "../function/pre-token-generation/resource";
import {
  CfnManagedLoginBranding,
  CfnUserPoolResourceServer,
  CfnUserPoolDomain,
  LambdaVersion,
  ManagedLoginVersion,
  UserPool,
  UserPoolOperation,
} from "aws-cdk-lib/aws-cognito";

const urls = ["http://localhost:5173/", "http://localhost:5174/", "http://localhost:5175/"];

/**
 * Define and configure your auth resource
 * @see https://docs.amplify.aws/gen2/build-a-backend/auth
 */
export const auth = defineAuth({
  loginWith: {
    email: true,
    externalProviders: {
      callbackUrls: urls,
      logoutUrls: urls,
      scopes: ["OPENID", "COGNITO_ADMIN"],
    },
  },
  triggers: {
    preTokenGeneration: preTokenGenerationFunction,
  },
  // デフォルトの管理者グループ
  groups: ["admin"],
});

export const setupAuth = (backend: BackendType, pathPrefix: string) => {
  const { cfnUserPool, cfnUserPoolClient } = backend.auth.resources.cfnResources;
  const authStack = Stack.of(cfnUserPool);

  // ユーザープール名を明示的に指定
  cfnUserPool.userPoolName = `${pathPrefix}-user-pool`;

  // ユーザー名でのログインを有効化
  cfnUserPool.usernameAttributes = [];

  // パスワードポリシーの設定
  cfnUserPool.policies = {
    passwordPolicy: {
      minimumLength: 6, // パスワードの最小文字数
      requireLowercase: true, // 小文字
      requireNumbers: true, // 数字
      requireSymbols: false, // 記号
      requireUppercase: false, // 大文字
      temporaryPasswordValidityDays: 7, // 一時パスワードの有効期間
    },
  };

  const agentResourceServer = new CfnUserPoolResourceServer(
    authStack,
    "AgentResourceServer",
    {
      userPoolId: cfnUserPool.ref,
      identifier: "workops-agent",
      name: "WorkOps Agent API",
      scopes: [
        {
          scopeName: "invoke",
          scopeDescription: "Invoke the WorkOps Agent chat API",
        },
      ],
    },
  );

  cfnUserPoolClient.allowedOAuthScopes = [
    "openid",
    "aws.cognito.signin.user.admin",
    "workops-agent/invoke",
  ];
  agentResourceServer.node.addDependency(cfnUserPool);
  cfnUserPoolClient.node.addDependency(agentResourceServer);

  // Pre Token Generation Lambdaトリガーの設定
  const userPool = backend.auth.resources.userPool.node
    .findAll()
    .find(
      (child): child is UserPool => child instanceof UserPool
    );
  if (userPool) {
    userPool.addTrigger(
      UserPoolOperation.PRE_TOKEN_GENERATION_CONFIG,
      backend.preTokenGenerationFunction.resources.lambda,
      LambdaVersion.V2_0
    );
  }

  // マネージドログインを有効化
  // ドメインはデフォルトでは公開されていないので探索する必要がある
  const userPoolDomain = backend.auth.resources.userPool.node
    .findAll()
    .find(
      (child): child is CfnUserPoolDomain => child instanceof CfnUserPoolDomain
    );
  if (userPoolDomain) {
    userPoolDomain.managedLoginVersion = ManagedLoginVersion.NEWER_MANAGED_LOGIN;
  }

  // Managed Loginのブランディング設定を有効化
  // Cognitoデフォルトのスタイルを適用
  new CfnManagedLoginBranding(backend.stack, "ManagedLoginBranding", {
    userPoolId: cfnUserPool.userPoolRef.userPoolId,
    clientId: cfnUserPoolClient.ref,
    useCognitoProvidedValues: true,
  });
};
