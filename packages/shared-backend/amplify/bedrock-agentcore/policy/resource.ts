import { CfnPolicy } from "aws-cdk-lib/aws-bedrockagentcore";
import { Construct } from "constructs";
import {
  GatewayPolicyDefinition,
} from "./policy-statements";

interface GatewayPolicyResourcesProps {
  policyEngineId: string;
  definitions: readonly GatewayPolicyDefinition[];
}

/** AgentCore Policy EngineへCedar policyを登録する。 */
export function createGatewayPolicyResources(
  scope: Construct,
  id: string,
  props: GatewayPolicyResourcesProps,
): readonly CfnPolicy[] {
  const policies: CfnPolicy[] = [];

  for (const [index, definition] of props.definitions.entries()) {
    const policy = new CfnPolicy(scope, `${id}${index}`, {
      name: definition.policyNameBase,
      description: definition.policyDescription,
      policyEngineId: props.policyEngineId,
      definition: {
        cedar: {
          statement: definition.cedarPolicy,
        },
      },
      validationMode: "FAIL_ON_ANY_FINDINGS",
      // Policy-level ACTIVEとGateway ENFORCEを組み合わせて、Cedar判定を強制する。
      enforcementMode: "ACTIVE",
    });

    // AgentCore ControlのPolicy read-after-create枠は小さいため、CloudFormationの
    // 同時作成で429にしないよう、デプロイ時だけ登録順を直列化する。
    const previousPolicy = policies.at(-1);
    if (previousPolicy) {
      policy.addResourceDependency(previousPolicy);
    }
    policies.push(policy);
  }

  return policies;
}
