import * as path from "path";
import { fileURLToPath } from "url";
import { CustomResource, Duration } from "aws-cdk-lib";
import { CfnPolicy } from "aws-cdk-lib/aws-bedrockagentcore";
import { Effect, PolicyStatement } from "aws-cdk-lib/aws-iam";
import { Runtime } from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { Provider } from "aws-cdk-lib/custom-resources";
import { Construct, IConstruct } from "constructs";
import type { GatewayPolicyDefinition } from "./policy-statements";

const currentFilePath = fileURLToPath(import.meta.url);
const currentDirPath = path.dirname(currentFilePath);

export interface CreatePolicyEngineAttachmentResourceProps {
  scope: Construct;
  branchName: string;
  gatewayId: string;
  gatewayRoleArn: string;
  policyEngineArn: string;
}

export interface CreateGatewayPolicyResourcesProps {
  scope: Construct;
  branchName: string;
  policyEngineId: string;
  policies: GatewayPolicyDefinition[];
  attachmentDependency: IConstruct;
}

export function createPolicyEngineAttachmentResource(
  props: CreatePolicyEngineAttachmentResourceProps,
): CustomResource {
  const { scope, branchName, gatewayId, gatewayRoleArn, policyEngineArn } = props;

  // Gateway への policy engine 関連付けは専用 stack で 1 回だけ実行する。
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

  const attachProvider = new Provider(scope, "AttachPolicyEngineProvider", {
    onEventHandler: attachPolicyEngineLambda,
  });

  return new CustomResource(scope, "AttachPolicyEngineResource", {
    serviceToken: attachProvider.serviceToken,
    properties: {
      gatewayId,
      policyEngineArn,
      mode: "ENFORCE",
    },
  });
}

export function createGatewayPolicyResources(
  props: CreateGatewayPolicyResourcesProps,
): void {
  const {
    scope,
    branchName,
    policyEngineId,
    policies,
    attachmentDependency,
  } = props;

  policies.forEach((policy) => {
    const normalizedLogicalId = policy.policyNameBase
      .replace(/[^A-Za-z0-9]/g, "_")
      .replace(/^([^A-Za-z])/, "P$1");
    const normalizedName = `${policy.policyNameBase}_${branchName}`
      .replace(/[^A-Za-z0-9_]/g, "_")
      .slice(0, 48);
    const policyName = /^[A-Za-z]/.test(normalizedName)
      ? normalizedName
      : `p${normalizedName}`.slice(0, 48);

    const policyResource = new CfnPolicy(
      scope,
      `${normalizedLogicalId}Policy`,
      {
        policyEngineId,
        name: policyName,
        description: `${policy.policyDescription} for ${branchName}`,
        validationMode: "FAIL_ON_ANY_FINDINGS",
        enforcementMode: "ACTIVE",
        definition: {
          cedar: {
            statement: policy.cedarPolicy,
          },
        },
      },
    );

    // Gateway のスキーマ検証があるため、attach 後に Cedar policy を登録する
    policyResource.node.addDependency(attachmentDependency);
  });
}
