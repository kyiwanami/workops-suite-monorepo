import { Schema } from "../../data/resource";

export type WorkopsRole = Schema["Role"]["type"];

export interface GatewayPolicyDefinition {
  policyNameBase: string;
  policyDescription: string;
  cedarPolicy: string;
}

const buildAdminCondition = (): string => {
  return `(
    principal.hasTag("workops_is_global_admin") &&
    principal.getTag("workops_is_global_admin") == "true"
  )`;
};

const buildRoleCondition = (role: WorkopsRole): string => {
  return `(
    principal.hasTag("workops_role") &&
    principal.getTag("workops_role") == "${role}"
  )`;
};

export const buildToolAccessPolicyStatement = (
  gatewayArn: string,
  gatewayTargetName: string,
  allowedRoles: WorkopsRole[],
): string => {
  const conditions = [
    buildAdminCondition(),
    ...allowedRoles.map((role) => buildRoleCondition(role)),
  ].join(" ||\n  ");

  return `permit(
  principal is AgentCore::OAuthUser,
  action == AgentCore::Action::"${gatewayTargetName}___${gatewayTargetName}",
  resource == AgentCore::Gateway::"${gatewayArn}"
)
when {
  ${conditions}
};`;
};

export const createGatewayPolicyDefinition = (
  gatewayArn: string,
  gatewayTargetName: string,
  allowedRoles: WorkopsRole[],
): GatewayPolicyDefinition => {
  return {
    policyNameBase: gatewayTargetName.replace(/-/g, "_"),
    policyDescription: `${gatewayTargetName} policy`,
    cedarPolicy: buildToolAccessPolicyStatement(
      gatewayArn,
      gatewayTargetName,
      allowedRoles,
    ),
  };
};
