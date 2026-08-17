import { CfnPolicy } from "aws-cdk-lib/aws-bedrockagentcore";
import { Construct } from "constructs";
import type { GatewayPolicyDefinition } from "./policy-statements";

export interface CreateGatewayPolicyResourcesProps {
  scope: Construct;
  branchName: string;
  policyEngineId: string;
  policies: GatewayPolicyDefinition[];
}

export function createGatewayPolicyResources(
  props: CreateGatewayPolicyResourcesProps,
): void {
  const {
    scope,
    branchName,
    policyEngineId,
    policies,
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

    new CfnPolicy(
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
  });
}
