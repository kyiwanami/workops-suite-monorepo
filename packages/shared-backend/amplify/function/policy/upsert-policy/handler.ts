import {
  BedrockAgentCoreControlClient,
  CreatePolicyCommand,
  GetPolicyCommand,
  UpdatePolicyCommand,
} from "@aws-sdk/client-bedrock-agentcore-control";

interface CustomResourceEvent {
  RequestType: "Create" | "Update" | "Delete";
  StackId: string;
  PhysicalResourceId?: string;
  ResourceProperties: {
    policyEngineId: string;
    policyNameBase: string;
    policyDescription: string;
    gatewayArn: string;
    cedarPolicy: string;
  };
}

interface CustomResourceResult {
  PhysicalResourceId: string;
  Data?: Record<string, string>;
}

const buildPolicyName = (baseName: string, stackId: string): string => {
  const stackUniquePart = String(stackId).split("/").pop() ?? "stack";
  const normalizedSuffix = stackUniquePart.replace(/[^A-Za-z0-9_]/g, "_");
  const normalizedBase = String(baseName).replace(/[^A-Za-z0-9_]/g, "_");
  const merged = `${normalizedBase}_${normalizedSuffix}`;
  const trimmed = merged.slice(0, 48);
  const startsWithLetter = /^[A-Za-z]/.test(trimmed);
  if (startsWithLetter) {
    return trimmed;
  }
  return `p${trimmed}`.slice(0, 48);
};

export const handler = async (
  event: CustomResourceEvent,
): Promise<CustomResourceResult> => {
  const policyEngineId = String(event.ResourceProperties.policyEngineId);
  const policyNameBase = String(event.ResourceProperties.policyNameBase);
  const policyDescription = String(event.ResourceProperties.policyDescription);
  const policyStatement = String(event.ResourceProperties.cedarPolicy);

  if (event.RequestType === "Delete") {
    return {
      PhysicalResourceId: event.PhysicalResourceId ?? "retained-policy",
    };
  }

  const client = new BedrockAgentCoreControlClient({});

  if (event.RequestType === "Create") {
    const policyName = buildPolicyName(policyNameBase, event.StackId);
    const created = await client.send(
      new CreatePolicyCommand({
        policyEngineId,
        name: policyName,
        description: policyDescription,
        validationMode: "FAIL_ON_ANY_FINDINGS",
        definition: {
          cedar: {
            statement: policyStatement,
          },
        },
      }),
    );

    if (created.policyId === undefined || created.policyArn === undefined) {
      throw new Error("CreatePolicy response is missing policy fields");
    }

    return {
      PhysicalResourceId: created.policyId,
      Data: {
        policyId: created.policyId,
        policyArn: created.policyArn,
      },
    };
  }

  const existingPolicyId = event.PhysicalResourceId;
  if (existingPolicyId === undefined) {
    throw new Error("PhysicalResourceId is required on Update");
  }

  await client.send(
    new GetPolicyCommand({
      policyEngineId,
      policyId: existingPolicyId,
    }),
  );

  const updated = await client.send(
    new UpdatePolicyCommand({
      policyEngineId,
      policyId: existingPolicyId,
      validationMode: "FAIL_ON_ANY_FINDINGS",
      definition: {
        cedar: {
          statement: policyStatement,
        },
      },
    }),
  );

  if (updated.policyArn === undefined) {
    throw new Error("UpdatePolicy response is missing policyArn");
  }

  return {
    PhysicalResourceId: existingPolicyId,
    Data: {
      policyId: existingPolicyId,
      policyArn: updated.policyArn,
    },
  };
};
