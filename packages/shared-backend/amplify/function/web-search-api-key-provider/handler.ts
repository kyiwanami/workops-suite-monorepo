import {
  BedrockAgentCoreControlClient,
  CreateApiKeyCredentialProviderCommand,
  GetApiKeyCredentialProviderCommand,
  DeleteApiKeyCredentialProviderCommand,
} from "@aws-sdk/client-bedrock-agentcore-control";
import type {
  CloudFormationCustomResourceEvent,
  CloudFormationCustomResourceResponse,
} from "aws-lambda";

// Bedrock AgentCore の API キー credential provider を CloudFormation ライフサイクルに同期する
export const handler = async (
  event: CloudFormationCustomResourceEvent,
): Promise<CloudFormationCustomResourceResponse> => {
  const { RequestType, ResourceProperties } = event;
  const providerName = String(ResourceProperties.providerName);
  const apiKeyValue = String(ResourceProperties.apiKeyValue);

  const client = new BedrockAgentCoreControlClient({});

  const responseSuccess = (
    physicalResourceId: string,
    data: Record<string, string>,
  ): CloudFormationCustomResourceResponse => {
    return {
      PhysicalResourceId: physicalResourceId,
      Status: "SUCCESS",
      RequestId: event.RequestId,
      StackId: event.StackId,
      LogicalResourceId: event.LogicalResourceId,
      Data: data,
    };
  };

  const getApiKeyCredentialProvider = async () => {
    const response = await client.send(
      new GetApiKeyCredentialProviderCommand({
        name: providerName,
      }),
    );

    const providerArn = response.credentialProviderArn;
    if (providerArn === undefined)
      throw new Error("credentialProviderArn is undefined");

    const apiKeySecret = response.apiKeySecretArn;
    if (apiKeySecret === undefined)
      throw new Error("apiKeySecretArn is undefined");

    const secretArn = apiKeySecret.secretArn;
    if (secretArn === undefined)
      throw new Error("apiKeySecretArn.secretArn is undefined");

    return { providerArn, secretArn };
  };

  const createApiKeyCredentialProvider = async () => {
    const response = await client.send(
      new CreateApiKeyCredentialProviderCommand({
        name: providerName,
        apiKey: apiKeyValue,
      }),
    );

    const providerArn = response.credentialProviderArn;
    if (providerArn === undefined)
      throw new Error("credentialProviderArn is undefined");

    const apiKeySecret = response.apiKeySecretArn;
    if (apiKeySecret === undefined)
      throw new Error("apiKeySecretArn is undefined");

    const secretArn = apiKeySecret.secretArn;
    if (secretArn === undefined)
      throw new Error("apiKeySecretArn.secretArn is undefined");

    return { providerArn, secretArn };
  };

  try {
    if (RequestType === "Delete") {
      await client.send(
        new DeleteApiKeyCredentialProviderCommand({
          name: providerName,
        }),
      );
      return responseSuccess(event.PhysicalResourceId ?? providerName, {});
    }

    let apiKeyCredentialProvider;
    if (RequestType === "Create") {
      apiKeyCredentialProvider = await createApiKeyCredentialProvider();
    } else {
      apiKeyCredentialProvider = await getApiKeyCredentialProvider();
    }

    return responseSuccess(`${providerName}-api-key-provider`, {
      providerArn: apiKeyCredentialProvider.providerArn,
      secretArn: apiKeyCredentialProvider.secretArn,
    });
  } catch (error) {
    console.error("Error:", error);
    throw error;
  }
};
