import { defineAuth } from "@aws-amplify/backend";
import type { BackendType } from "../backend";
import { preTokenGenerationFunction } from "../function/pre-token-generation/resource";
import {
  LambdaVersion,
  UserPool,
  UserPoolOperation,
} from "aws-cdk-lib/aws-cognito";

/**
 * Define and configure your auth resource
 * @see https://docs.amplify.aws/gen2/build-a-backend/auth
 */
export const auth = defineAuth({
  loginWith: {
    email: true,
  },
  triggers: {
    preTokenGeneration: preTokenGenerationFunction,
  },
  // デフォルトの管理者グループ
  groups: ["admin"],
});

export const setupAuth = (backend: BackendType, pathPrefix: string) => {
  const { cfnUserPool } = backend.auth.resources.cfnResources;

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
};
