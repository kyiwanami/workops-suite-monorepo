import { Aws, Fn } from "aws-cdk-lib";
import { Effect, PolicyStatement } from "aws-cdk-lib/aws-iam";
import {
  AwsCustomResource,
  AwsCustomResourcePolicy,
  PhysicalResourceId,
  PhysicalResourceIdReference,
} from "aws-cdk-lib/custom-resources";
import { Construct } from "constructs";

export interface PolicyEngineProps {
  projectPathPrefix: string;
}

export class PolicyEngine extends Construct {
  public readonly policyEngineArn: string;
  public readonly policyEngineId: string;

  constructor(scope: Construct, id: string, props: PolicyEngineProps) {
    super(scope, id);

    // Retain 後の再作成でも名前衝突しないように Stack ID 由来のサフィックスを付ける
    const stackUniquePart = Fn.select(2, Fn.split("/", Aws.STACK_ID));
    const normalizedSuffix = Fn.join("", Fn.split("-", stackUniquePart));
    const normalizedPrefix = props.projectPathPrefix
      .replace(/[^A-Za-z0-9_]/g, "_")
      .slice(0, 12);

    const policyEngineName = Fn.join("_", ["p", normalizedPrefix, normalizedSuffix]);

    const resource = new AwsCustomResource(this, "Resource", {
      onCreate: {
        service: "@aws-sdk/client-bedrock-agentcore-control",
        action: "CreatePolicyEngineCommand",
        parameters: {
          name: policyEngineName,
          description: `Policy engine for ${props.projectPathPrefix}`,
        },
        physicalResourceId: PhysicalResourceId.fromResponse("policyEngineId"),
      },
      onUpdate: {
        service: "@aws-sdk/client-bedrock-agentcore-control",
        action: "GetPolicyEngineCommand",
        parameters: {
          policyEngineId: new PhysicalResourceIdReference(),
        },
      },
      installLatestAwsSdk: true,
      policy: AwsCustomResourcePolicy.fromStatements([
        new PolicyStatement({
          effect: Effect.ALLOW,
          actions: [
            "bedrock-agentcore:CreatePolicyEngine",
            "bedrock-agentcore:GetPolicyEngine",
          ],
          resources: ["*"],
        }),
      ]),
    });

    this.policyEngineId = resource.getResponseField("policyEngineId");
    this.policyEngineArn = resource.getResponseField("policyEngineArn");
  }
}
