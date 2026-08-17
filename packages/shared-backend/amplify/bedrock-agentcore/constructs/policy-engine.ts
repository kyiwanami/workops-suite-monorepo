import { Aws, Fn } from "aws-cdk-lib";
import { CfnPolicyEngine } from "aws-cdk-lib/aws-bedrockagentcore";
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

    const resource = new CfnPolicyEngine(this, "Resource", {
      name: policyEngineName,
      description: `Policy engine for ${props.projectPathPrefix}`,
    });

    this.policyEngineId = resource.attrPolicyEngineId;
    this.policyEngineArn = resource.attrPolicyEngineArn;
  }
}
