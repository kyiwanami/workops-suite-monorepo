import type { CloudFormationCustomResourceEvent } from "aws-lambda";
import {
  CognitoIdentityProviderClient,
  DescribeUserPoolClientCommand,
  UpdateUserPoolClientCommand,
} from "@aws-sdk/client-cognito-identity-provider";

const cognitoClient = new CognitoIdentityProviderClient({});

// カスタムプロパティの型定義
interface CallbackUrlResourceProperties {
  UserPoolId: string;
  ClientId: string;
  CallbackUrl: string;
  LogoutUrl: string;
}

// CloudFormation CustomResourceハンドラー（Providerフレームワーク用）
export const handler = async (
  event: CloudFormationCustomResourceEvent<CallbackUrlResourceProperties>
) => {
  console.log("CustomResource event:", JSON.stringify(event));

  const { RequestType, ResourceProperties } = event;

  try {
    if (RequestType === "Create" || RequestType === "Update") {
      // 既存の設定を取得
      const describeCommand = new DescribeUserPoolClientCommand({
        UserPoolId: ResourceProperties.UserPoolId,
        ClientId: ResourceProperties.ClientId,
      });

      const describeResponse = await cognitoClient.send(describeCommand);
      const currentConfig = describeResponse.UserPoolClient;

      if (!currentConfig) {
        throw new Error("UserPoolClient not found");
      }

      // コールバックURLを追加（重複チェック）
      const callbackUrls = currentConfig.CallbackURLs ?? [];
      if (
        ResourceProperties.CallbackUrl &&
        !callbackUrls.includes(ResourceProperties.CallbackUrl)
      ) {
        callbackUrls.push(ResourceProperties.CallbackUrl);
      }

      // ログアウトURLを追加（重複チェック）
      const logoutUrls = currentConfig.LogoutURLs ?? [];
      if (
        ResourceProperties.LogoutUrl &&
        !logoutUrls.includes(ResourceProperties.LogoutUrl)
      ) {
        logoutUrls.push(ResourceProperties.LogoutUrl);
      }

      // 全設定を保持しながら更新
      const updateCommand = new UpdateUserPoolClientCommand({
        UserPoolId: ResourceProperties.UserPoolId,
        ClientId: ResourceProperties.ClientId,
        CallbackURLs: callbackUrls,
        LogoutURLs: logoutUrls,
        // 既存の設定を全て保持
        AllowedOAuthFlows: currentConfig.AllowedOAuthFlows,
        AllowedOAuthScopes: currentConfig.AllowedOAuthScopes,
        AllowedOAuthFlowsUserPoolClient:
          currentConfig.AllowedOAuthFlowsUserPoolClient,
        SupportedIdentityProviders: currentConfig.SupportedIdentityProviders,
        ReadAttributes: currentConfig.ReadAttributes,
        WriteAttributes: currentConfig.WriteAttributes,
      });

      await cognitoClient.send(updateCommand);

      console.log("Successfully updated callback URLs");

      return {
        PhysicalResourceId: ResourceProperties.ClientId,
      };
    }

    if (RequestType === "Delete") {
      // 削除時は何もしない（他のアプリのURLを残すため）
      console.log("Delete event - no action taken");
      return {
        PhysicalResourceId: event.PhysicalResourceId,
      };
    }

    throw new Error(`Unknown RequestType: ${RequestType}`);
  } catch (error) {
    console.error("Error handling custom resource:", error);
    throw error;
  }
};
