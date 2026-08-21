import { gatewayActionName } from "../tool-access";
import type { ToolName } from "../tool-access";

/** Gateway policy engineはsandboxを含め、初回作成時から強制モードに固定する。 */
export const gatewayPolicyMode = "ENFORCE" as const;

export interface GatewayPolicyDefinition {
  policyNameBase: string;
  policyDescription: string;
  cedarPolicy: string;
}

function cedarStatement(
  gatewayArn: string,
  toolName: ToolName,
  gatewayPrincipalId: string,
): string {
  return [
    "permit (",
    `  principal == AgentCore::IamEntity::"${gatewayPrincipalId}",`,
    `  action == AgentCore::Action::"${gatewayActionName(toolName)}",`,
    `  resource == AgentCore::Gateway::"${gatewayArn}"`,
    ");",
  ].join("\n");
}

export function createGatewayPolicyDefinitions(
  gatewayArn: string,
  toolName: ToolName,
  gatewayPrincipalId: string,
  deploymentKey: string,
): readonly GatewayPolicyDefinition[] {
  return [
    {
      // The service currently rejects a policy name that exists in another
      // policy engine, despite the CloudFormation contract saying uniqueness
      // is scoped to one engine. Prefix with a deterministic deployment key
      // so isolated sandboxes stay reversible without renaming Cedar actions.
      policyNameBase: `p_${deploymentKey}_${toolName.replaceAll("-", "_")}`,
      policyDescription: `${toolName} exact IAM principal and action policy`,
      cedarPolicy: cedarStatement(gatewayArn, toolName, gatewayPrincipalId),
    },
  ];
}
