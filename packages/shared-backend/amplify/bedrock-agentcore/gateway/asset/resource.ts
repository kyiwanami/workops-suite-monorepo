import {
  Gateway,
  GatewayTarget,
} from "aws-cdk-lib/aws-bedrockagentcore";
import { Role } from "aws-cdk-lib/aws-iam";
import { CfnPermission } from "aws-cdk-lib/aws-lambda";
import type { IFunction } from "aws-cdk-lib/aws-lambda";
import { Construct, IConstruct } from "constructs";
import {
  assetToolNames,
  createAssetToolSchema,
  createAssetTypeToolSchema,
  deleteAssetToolSchema,
  getAssetToolSchema,
  listAssetsToolSchema,
  listAssetTypesToolSchema,
  searchAssetKnowledgeBaseToolSchema,
  updateAssetToolSchema,
} from "./tool-schemas";

export interface CreateGatewayTargetsProps {
  scope: Construct;
  gatewayArn: string;
  gatewayId: string;
  gatewayName: string;
  gatewayRoleArn: string;
  assetCreateLambda: IFunction;
  assetKbSearchLambda: IFunction;
  assetUpdateLambda: IFunction;
  assetDeleteLambda: IFunction;
  assetListLambda: IFunction;
  assetGetLambda: IFunction;
  assetTypeListLambda: IFunction;
  assetTypeCreateLambda: IFunction;
}

/**
 * AgentCore Gateway にターゲット（ツール）を登録する
 */
export function createGatewayTargets(props: CreateGatewayTargetsProps): void {
  const {
    scope,
    gatewayArn,
    gatewayId,
    gatewayName,
    gatewayRoleArn,
    assetCreateLambda,
    assetKbSearchLambda,
    assetUpdateLambda,
    assetDeleteLambda,
    assetListLambda,
    assetGetLambda,
    assetTypeListLambda,
    assetTypeCreateLambda,
  } = props;

  // 作成済みの単一Gatewayを参照し、Asset targetを登録する。
  const gateway = Gateway.fromGatewayAttributes(scope, "ImportedGateway", {
    gatewayArn,
    gatewayId,
    gatewayName,
    role: Role.fromRoleArn(scope, "ImportedGatewayRole", gatewayRoleArn, {
      mutable: false,
    }),
  });

  const roleDefaultPolicy = gateway.role.node.tryFindChild("DefaultPolicy");

  // 2. create-asset ターゲット
  // IAMポリシー（アイデンティティベース）の反映待ちを避け、リソースベースポリシーを同期的に設定する (Issue #36826 回避策)
  const createAssetPermission = new CfnPermission(scope, "AssetCreateGatewayPermission", {
    action: "lambda:InvokeFunction",
    functionName: assetCreateLambda.functionArn,
    principal: gatewayRoleArn,
    sourceArn: gatewayArn,
  });

  const createAssetDependencies: IConstruct[] = [createAssetPermission];
  if (roleDefaultPolicy) {
    createAssetDependencies.push(roleDefaultPolicy);
  }

  const createAssetTarget = GatewayTarget.forLambda(scope, "CreateAssetTarget", {
    gateway,
    lambdaFunction: assetCreateLambda,
    toolSchema: createAssetToolSchema,
    gatewayTargetName: assetToolNames.createAsset,
    description: "Creates a new Asset",
  });

  createAssetTarget.node.addDependency(...createAssetDependencies);

  // 3. search-asset-kb ターゲット
  const kbSearchPermission = new CfnPermission(scope, "AssetKbSearchGatewayPermission", {
    action: "lambda:InvokeFunction",
    functionName: assetKbSearchLambda.functionArn,
    principal: gatewayRoleArn,
    sourceArn: gatewayArn,
  });

  const kbSearchDependencies: IConstruct[] = [kbSearchPermission];
  if (roleDefaultPolicy) {
    kbSearchDependencies.push(roleDefaultPolicy);
  }

  const kbSearchTarget = GatewayTarget.forLambda(scope, "SearchAssetTarget", {
    gateway,
    lambdaFunction: assetKbSearchLambda,
    toolSchema: searchAssetKnowledgeBaseToolSchema,
    gatewayTargetName: assetToolNames.searchAssetKb,
    description:
      "Semantic asset search when list-assets GSI combinations are not applicable",
  });

  kbSearchTarget.node.addDependency(...kbSearchDependencies);

  // 4. update-asset ターゲット
  const updateAssetPermission = new CfnPermission(scope, "AssetUpdateGatewayPermission", {
    action: "lambda:InvokeFunction",
    functionName: assetUpdateLambda.functionArn,
    principal: gatewayRoleArn,
    sourceArn: gatewayArn,
  });

  const updateAssetDependencies: IConstruct[] = [updateAssetPermission];
  if (roleDefaultPolicy) {
    updateAssetDependencies.push(roleDefaultPolicy);
  }

  const updateAssetTarget = GatewayTarget.forLambda(scope, "UpdateAssetTarget", {
    gateway,
    lambdaFunction: assetUpdateLambda,
    toolSchema: updateAssetToolSchema,
    gatewayTargetName: assetToolNames.updateAsset,
    description: "Updates an existing Asset",
  });

  updateAssetTarget.node.addDependency(...updateAssetDependencies);

  // 5. delete-asset ターゲット
  const deleteAssetPermission = new CfnPermission(scope, "AssetDeleteGatewayPermission", {
    action: "lambda:InvokeFunction",
    functionName: assetDeleteLambda.functionArn,
    principal: gatewayRoleArn,
    sourceArn: gatewayArn,
  });

  const deleteAssetDependencies: IConstruct[] = [deleteAssetPermission];
  if (roleDefaultPolicy) {
    deleteAssetDependencies.push(roleDefaultPolicy);
  }

  const deleteAssetTarget = GatewayTarget.forLambda(scope, "DeleteAssetTarget", {
    gateway,
    lambdaFunction: assetDeleteLambda,
    toolSchema: deleteAssetToolSchema,
    gatewayTargetName: assetToolNames.deleteAsset,
    description: "Deletes an Asset",
  });

  deleteAssetTarget.node.addDependency(...deleteAssetDependencies);

  // 6. list-assets ターゲット
  const listAssetsPermission = new CfnPermission(scope, "AssetListGatewayPermission", {
    action: "lambda:InvokeFunction",
    functionName: assetListLambda.functionArn,
    principal: gatewayRoleArn,
    sourceArn: gatewayArn,
  });

  const listAssetsDependencies: IConstruct[] = [listAssetsPermission];
  if (roleDefaultPolicy) {
    listAssetsDependencies.push(roleDefaultPolicy);
  }

  const listAssetsTarget = GatewayTarget.forLambda(scope, "ListAssetsTarget", {
    gateway,
    lambdaFunction: assetListLambda,
    toolSchema: listAssetsToolSchema,
    gatewayTargetName: assetToolNames.listAssets,
    description:
      "GSI-only asset listing. Allowed combinations: departmentId, departmentId+status, assigneeSub, assigneeSub+status, assetTypeId",
  });

  listAssetsTarget.node.addDependency(...listAssetsDependencies);

  // 7. get-asset ターゲット
  const getAssetPermission = new CfnPermission(scope, "AssetGetGatewayPermission", {
    action: "lambda:InvokeFunction",
    functionName: assetGetLambda.functionArn,
    principal: gatewayRoleArn,
    sourceArn: gatewayArn,
  });

  const getAssetDependencies: IConstruct[] = [getAssetPermission];
  if (roleDefaultPolicy) {
    getAssetDependencies.push(roleDefaultPolicy);
  }

  const getAssetTarget = GatewayTarget.forLambda(scope, "GetAssetTarget", {
    gateway,
    lambdaFunction: assetGetLambda,
    toolSchema: getAssetToolSchema,
    gatewayTargetName: assetToolNames.getAsset,
    description: "Gets a single Asset by ID",
  });

  getAssetTarget.node.addDependency(...getAssetDependencies);

  // 8. list-asset-types ターゲット
  const listAssetTypesPermission = new CfnPermission(scope, "AssetTypeListGatewayPermission", {
    action: "lambda:InvokeFunction",
    functionName: assetTypeListLambda.functionArn,
    principal: gatewayRoleArn,
    sourceArn: gatewayArn,
  });

  const listAssetTypesDependencies: IConstruct[] = [listAssetTypesPermission];
  if (roleDefaultPolicy) {
    listAssetTypesDependencies.push(roleDefaultPolicy);
  }

  const listAssetTypesTarget = GatewayTarget.forLambda(scope, "ListAssetTypesTarget", {
    gateway,
    lambdaFunction: assetTypeListLambda,
    toolSchema: listAssetTypesToolSchema,
    gatewayTargetName: assetToolNames.listAssetTypes,
    description: "Lists all AssetTypes",
  });

  listAssetTypesTarget.node.addDependency(...listAssetTypesDependencies);

  // 9. create-asset-type ターゲット
  const createAssetTypePermission = new CfnPermission(scope, "AssetTypeCreateGatewayPermission", {
    action: "lambda:InvokeFunction",
    functionName: assetTypeCreateLambda.functionArn,
    principal: gatewayRoleArn,
    sourceArn: gatewayArn,
  });

  const createAssetTypeDependencies: IConstruct[] = [createAssetTypePermission];
  if (roleDefaultPolicy) {
    createAssetTypeDependencies.push(roleDefaultPolicy);
  }

  const createAssetTypeTarget = GatewayTarget.forLambda(scope, "CreateAssetTypeTarget", {
    gateway,
    lambdaFunction: assetTypeCreateLambda,
    toolSchema: createAssetTypeToolSchema,
    gatewayTargetName: assetToolNames.createAssetType,
    description: "Creates a new AssetType",
  });

  createAssetTypeTarget.node.addDependency(...createAssetTypeDependencies);
}
