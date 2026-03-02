import type { BackendType } from "../backend";
import { GetParameterCommand, SSMClient } from "@aws-sdk/client-ssm";
import * as ssm from "aws-cdk-lib/aws-ssm";

// Parameter Store引数
export type ParameterStoreArgs = {
  pathPrefix: string;
  userPoolId: string;
  identityPoolId: string;
  authRoleArn: string;
  unauthRoleArn: string;
  userPoolClientId: string;
};

/**
 * Parameter Store設定
 * 他サブシステムが利用するために必要な情報を登録
 */
export const setupParameterStore = (
  backend: BackendType,
  args: ParameterStoreArgs,
) => {
  // Parameter Store用のスタックを作成
  const parameterStoreStack = backend.createStack("ParameterStoreStack");

  // パラメータ定義
  const parameters = [
    {
      name: "USER_POOL_ID",
      value: args.userPoolId,
      description: "ユーザープールID",
    },
    {
      name: "IDENTITY_POOL_ID",
      value: args.identityPoolId,
      description: "IDプールID",
    },
    {
      name: "AUTH_ROLE_ARN",
      value: args.authRoleArn,
      description: "認証ロールARN",
    },
    {
      name: "UNAUTH_ROLE_ARN",
      value: args.unauthRoleArn,
      description: "非認証ロールARN",
    },
    {
      name: "USER_POOL_CLIENT_ID",
      value: args.userPoolClientId,
      description: "ユーザープールクライアントID",
    },
  ];

  // パラメータストアに登録
  parameters.forEach((param) => {
    new ssm.StringParameter(parameterStoreStack, `${param.name}Parameter`, {
      parameterName: `/amplify/${args.pathPrefix}/${param.name}`,
      stringValue: param.value,
      description: param.description,
      tier: ssm.ParameterTier.STANDARD,
    });
  });
};

const PARAMETERS = [
  "USER_POOL_ID",
  "IDENTITY_POOL_ID",
  "AUTH_ROLE_ARN",
  "UNAUTH_ROLE_ARN",
  "USER_POOL_CLIENT_ID",
  "GATEWAY_ID",
  "GATEWAY_ARN",
  "GATEWAY_NAME",
  "GATEWAY_ROLE_ARN",
  "POLICY_ENGINE_ID",
  "POLICY_ENGINE_ARN",
  "RUNTIME_ARN",
] as const;

export type ParameterStoreConfig = Record<(typeof PARAMETERS)[number], string>;

/**
 * Parameter Storeから設定を非同期で取得
 * 必須パラメータが不足している場合は失敗させる
 */
export const createParameterStore = async (
  pathPrefix: string,
): Promise<ParameterStoreConfig> => {
  const ssmClient = new SSMClient({});
  const basePath = `/amplify/${pathPrefix}`;
  const config: ParameterStoreConfig = {
    USER_POOL_ID: "",
    IDENTITY_POOL_ID: "",
    AUTH_ROLE_ARN: "",
    UNAUTH_ROLE_ARN: "",
    USER_POOL_CLIENT_ID: "",
    GATEWAY_ID: "",
    GATEWAY_ARN: "",
    GATEWAY_NAME: "",
    GATEWAY_ROLE_ARN: "",
    POLICY_ENGINE_ID: "",
    POLICY_ENGINE_ARN: "",
    RUNTIME_ARN: "",
  };

  for (const paramName of PARAMETERS) {
    const command = new GetParameterCommand({
      Name: `${basePath}/${paramName}`,
      WithDecryption: true,
    });

    const result = await ssmClient.send(command);
    const value = result.Parameter?.Value;

    if (!value) {
      throw new Error(`[SSM] 必須パラメータが未設定です: ${basePath}/${paramName}`);
    }

    config[paramName] = value;
  }

  return config;
};
