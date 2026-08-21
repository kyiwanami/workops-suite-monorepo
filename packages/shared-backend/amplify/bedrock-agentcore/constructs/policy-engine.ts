import { CfnPolicyEngine } from "aws-cdk-lib/aws-bedrockagentcore";
import { Construct } from "constructs";

interface PolicyEngineProps {
  policyEngineName: string;
}

/** AgentCore Gatewayが参照する公開Cfn Policy Engine。 */
export class PolicyEngine extends Construct {
  public readonly policyEngine: CfnPolicyEngine;
  public readonly policyEngineArn: string;
  public readonly policyEngineId: string;

  constructor(scope: Construct, id: string, props: PolicyEngineProps) {
    super(scope, id);

    this.policyEngine = new CfnPolicyEngine(this, "PolicyEngine", {
      name: props.policyEngineName,
      description: "WorkOps exact tool authorization policies",
    });
    this.policyEngineArn = this.policyEngine.attrPolicyEngineArn;
    this.policyEngineId = this.policyEngine.attrPolicyEngineId;
  }
}
