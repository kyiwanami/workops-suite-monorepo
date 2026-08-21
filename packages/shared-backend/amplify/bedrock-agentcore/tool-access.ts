import { assetToolNames } from "./gateway/asset/tool-schemas";
import { requestToolNames } from "./gateway/request/tool-schemas";

export const toolNames = {
  ...assetToolNames,
  ...requestToolNames,
} as const;

export type ToolName = (typeof toolNames)[keyof typeof toolNames];

/** Managed Harness内蔵clientが受理できるversionだけをGatewayから広告する。 */
export const gatewayMcpProtocolVersions = ["2025-11-25"] as const;

/** Managed Harnessへ登録するnative Gateway server名。 */
export const gatewayServerName = "workops_tools";

/** 現在のGateway Cedar policyで利用を許可するread-only tool。 */
export const allowedToolNames: readonly ToolName[] = [
  toolNames.searchAssetKb,
  toolNames.listAssets,
  toolNames.getAsset,
  toolNames.listAssetTypes,
  toolNames.searchRequestKb,
  toolNames.getRequest,
  toolNames.listRequests,
  toolNames.listRequestTypes,
];

export function gatewayActionName(toolName: ToolName): string {
  return `${toolName}___${toolName}`;
}
