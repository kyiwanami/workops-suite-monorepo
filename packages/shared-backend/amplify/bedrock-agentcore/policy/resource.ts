import * as path from "path";
import { fileURLToPath } from "url";
import { CustomResource, Duration } from "aws-cdk-lib";
import { Effect, PolicyStatement } from "aws-cdk-lib/aws-iam";
import { Runtime } from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { Provider } from "aws-cdk-lib/custom-resources";
import { Construct } from "constructs";
import type { GatewayPolicyDefinition } from "./policy-statements";

const currentFilePath = fileURLToPath(import.meta.url);
const currentDirPath = path.dirname(currentFilePath);

export interface CreateGatewayPolicyResourcesProps {
  scope: Construct;
  branchName: string;
  gatewayId: string;
  gatewayArn: string;
  gatewayRoleArn: string;
  policyEngineArn: string;
  policyEngineId: string;
  policies: GatewayPolicyDefinition[];
}

export function createGatewayPolicyResources(
  props: CreateGatewayPolicyResourcesProps,
): void {
  const {
    scope,
    branchName,
    gatewayId,
    gatewayArn,
    gatewayRoleArn,
    policyEngineArn,
    policyEngineId,
    policies,
  } = props;

  // SDK 差異を避けるため、attach/update を custom resource handler に閉じ込める
  const attachPolicyEngineLambda = new NodejsFunction(
    scope,
    "AttachPolicyEngineCustomResourceHandler",
    {
      runtime: Runtime.NODEJS_20_X,
      entry: path.join(
        currentDirPath,
        "..",
        "..",
        "function",
        "policy",
        "attach-policy-engine",
        "handler.ts",
      ),
      handler: "handler",
      bundling: {
        bundleAwsSDK: true,
      },
      timeout: Duration.seconds(60),
      description: `Attach policy engine handler for ${branchName}`,
    },
  );

  attachPolicyEngineLambda.addToRolePolicy(
    new PolicyStatement({
      effect: Effect.ALLOW,
      actions: ["bedrock-agentcore:GetGateway", "bedrock-agentcore:UpdateGateway"],
      resources: ["*"],
    }),
  );

  attachPolicyEngineLambda.addToRolePolicy(
    new PolicyStatement({
      effect: Effect.ALLOW,
      actions: ["iam:PassRole"],
      resources: [gatewayRoleArn],
    }),
  );

  const upsertPolicyLambda = new NodejsFunction(
    scope,
    "UpsertPolicyCustomResourceHandler",
    {
      runtime: Runtime.NODEJS_20_X,
      entry: path.join(
        currentDirPath,
        "..",
        "..",
        "function",
        "policy",
        "upsert-policy",
        "handler.ts",
      ),
      handler: "handler",
      bundling: {
        bundleAwsSDK: true,
      },
      timeout: Duration.seconds(60),
      description: `Upsert policy handler for ${branchName}`,
    },
  );

  upsertPolicyLambda.addToRolePolicy(
    new PolicyStatement({
      effect: Effect.ALLOW,
      actions: [
        "bedrock-agentcore:CreatePolicy",
        "bedrock-agentcore:GetPolicy",
        "bedrock-agentcore:GetGateway",
        "bedrock-agentcore:UpdatePolicy",
        "bedrock-agentcore:ManageResourceScopedPolicy",
        "bedrock-agentcore:ManageAdminPolicy",
      ],
      resources: ["*"],
    }),
  );

  const attachProvider = new Provider(scope, "AttachPolicyEngineProvider", {
    onEventHandler: attachPolicyEngineLambda,
  });

  const attachResource = new CustomResource(scope, "AttachPolicyEngineResource", {
    serviceToken: attachProvider.serviceToken,
    properties: {
      gatewayId,
      policyEngineArn,
      mode: "ENFORCE",
    },
  });

  const policyProvider = new Provider(scope, "UpsertPolicyProvider", {
    onEventHandler: upsertPolicyLambda,
  });

  policies.forEach((policy) => {
    const normalizedLogicalId = policy.policyNameBase
      .replace(/[^A-Za-z0-9]/g, "_")
      .replace(/^([^A-Za-z])/, "P$1");

    const policyResource = new CustomResource(
      scope,
      `${normalizedLogicalId}PolicyResource`,
      {
        serviceToken: policyProvider.serviceToken,
        properties: {
          policyEngineId,
          policyNameBase: `${policy.policyNameBase}_${branchName.replace(/-/g, "_")}`,
          policyDescription: `${policy.policyDescription} for ${branchName}`,
          gatewayArn,
          cedarPolicy: policy.cedarPolicy,
        },
      },
    );

    // Gateway のスキーマ検証があるため、attach 後に Cedar policy を登録する
    policyResource.node.addDependency(attachResource);
  });
}
