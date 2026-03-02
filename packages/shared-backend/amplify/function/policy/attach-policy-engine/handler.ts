import {
  BedrockAgentCoreControlClient,
  GetGatewayCommand,
  UpdateGatewayCommand,
} from "@aws-sdk/client-bedrock-agentcore-control";

interface CustomResourceEvent {
  RequestType: "Create" | "Update" | "Delete";
  PhysicalResourceId?: string;
  ResourceProperties: {
    gatewayId: string;
    policyEngineArn: string;
    mode?: string;
  };
}

interface CustomResourceResult {
  PhysicalResourceId: string;
  Data?: Record<string, string>;
}

export const handler = async (
  event: CustomResourceEvent,
): Promise<CustomResourceResult> => {
  const gatewayId = String(event.ResourceProperties.gatewayId);
  const policyEngineArn = String(event.ResourceProperties.policyEngineArn);
  const modeCandidate = String(event.ResourceProperties.mode ?? "LOG_ONLY");
  const mode = modeCandidate === "ENFORCE" ? "ENFORCE" : "LOG_ONLY";
  const physicalResourceId =
    event.PhysicalResourceId ?? `${gatewayId}-policy-engine-attachment`;

  if (event.RequestType === "Delete") {
    return { PhysicalResourceId: physicalResourceId };
  }

  const client = new BedrockAgentCoreControlClient({});
  const gateway = await client.send(
    new GetGatewayCommand({
      gatewayIdentifier: gatewayId,
    }),
  );

  if (
    gateway.name === undefined ||
    gateway.roleArn === undefined ||
    gateway.protocolType === undefined ||
    gateway.authorizerType === undefined
  ) {
    throw new Error("GetGateway response is missing required fields");
  }

  const updated = await client.send(
    new UpdateGatewayCommand({
      gatewayIdentifier: gatewayId,
      name: gateway.name,
      description: gateway.description,
      roleArn: gateway.roleArn,
      protocolType: gateway.protocolType,
      protocolConfiguration: gateway.protocolConfiguration,
      authorizerType: gateway.authorizerType,
      authorizerConfiguration: gateway.authorizerConfiguration,
      kmsKeyArn: gateway.kmsKeyArn,
      interceptorConfigurations: gateway.interceptorConfigurations,
      exceptionLevel: gateway.exceptionLevel,
      policyEngineConfiguration: {
        arn: policyEngineArn,
        mode,
      },
    }),
  );

  return {
    PhysicalResourceId: physicalResourceId,
    Data: {
      gatewayId,
      gatewayArn: updated.gatewayArn ?? "",
      gatewayUrl: updated.gatewayUrl ?? "",
      policyEngineArn,
      mode,
    },
  };
};
