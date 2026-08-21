import { defineBackend } from "@aws-amplify/backend";
import { createHash } from "node:crypto";
import { aws_iam as iam } from "aws-cdk-lib";
import { PolicyStatement } from "aws-cdk-lib/aws-iam";
import { StartingPosition } from "aws-cdk-lib/aws-lambda";
import { DynamoEventSource } from "aws-cdk-lib/aws-lambda-event-sources";
import { auth, setupAuth } from "./auth/resource";
import { data } from "./data/resource";
import { ToolGateway } from "./bedrock-agentcore/constructs/tool-gateway";
import { AgentHarness } from "./bedrock-agentcore/constructs/harness";
import { PolicyEngine } from "./bedrock-agentcore/constructs/policy-engine";
import { allowedToolNames } from "./bedrock-agentcore/tool-access";
import {
  createGatewayPolicyDefinitions,
  gatewayPolicyMode,
} from "./bedrock-agentcore/policy/policy-statements";
import { createGatewayPolicyResources } from "./bedrock-agentcore/policy/resource";
import { AgentRestApi } from "./agent-api/resource";
import { assetStorage } from "./storage/resource";
import { VectorStoreResources as AssetVectorStoreResources } from "./s3vectors/asset/resource";
import { BedrockResources as AssetBedrockResources } from "./bedrock/asset/resource";

import { listUsersFunction } from "./function/user-operations/list-users/resource";
import { getUserFunction } from "./function/user-operations/get-user/resource";
import { createUserFunction } from "./function/user-operations/create-user/resource";
import { setUserEnabledFunction } from "./function/user-operations/set-user-enabled/resource";
import { deleteUserFunction } from "./function/user-operations/delete-user/resource";

import { listGroupsFunction } from "./function/group-operations/list-groups/resource";
import { createGroupFunction } from "./function/group-operations/create-group/resource";
import { deleteGroupFunction } from "./function/group-operations/delete-group/resource";
import { addUserToGroupFunction } from "./function/group-operations/add-user-to-group/resource";
import { removeUserFromGroupFunction } from "./function/group-operations/remove-user-from-group/resource";
import { listGroupsForUserFunction } from "./function/group-operations/list-groups-for-user/resource";
import { listUsersInGroupFunction } from "./function/group-operations/list-users-in-group/resource";
import { departmentStreamHandlerFunction } from "./function/department-stream-handler/resource";
import { preTokenGenerationFunction } from "./function/pre-token-generation/resource";

import { assetToolCreate } from "./function/tools/asset-tool-create/resource";
import { assetKbSearch } from "./function/tools/asset-kb-search/resource";
import { assetToolUpdate } from "./function/tools/asset-tool-update/resource";
import { assetToolDelete } from "./function/tools/asset-tool-delete/resource";
import { assetToolList } from "./function/tools/asset-tool-list/resource";
import { assetToolGet } from "./function/tools/asset-tool-get/resource";
import { assetTypeToolList } from "./function/tools/asset-type-tool-list/resource";
import { assetTypeToolCreate } from "./function/tools/asset-type-tool-create/resource";
import { syncAsset } from "./function/sync-asset/resource";

import { requestToolCreate } from "./function/tools/request-tool-create/resource";
import { requestKbSearch } from "./function/tools/request-kb-search/resource";
import { requestToolGet } from "./function/tools/request-tool-get/resource";
import { requestToolList } from "./function/tools/request-tool-list/resource";
import { requestToolUpdate } from "./function/tools/request-tool-update/resource";
import { requestTypeToolList } from "./function/tools/request-type-tool-list/resource";
import { syncRequest } from "./function/sync-request/resource";

import { createGatewayTargets as createAssetGatewayTargets } from "./bedrock-agentcore/gateway/asset/resource";
import { createGatewayTargets as createRequestGatewayTargets } from "./bedrock-agentcore/gateway/request/resource";
import { agentcoreBff } from "./function/agentcore-bff/resource";

const backend = defineBackend({
  auth,
  data,
  assetStorage,
  agentcoreBff,
  listUsersFunction,
  getUserFunction,
  createUserFunction,
  setUserEnabledFunction,
  deleteUserFunction,
  listGroupsFunction,
  createGroupFunction,
  deleteGroupFunction,
  addUserToGroupFunction,
  removeUserFromGroupFunction,
  listGroupsForUserFunction,
  listUsersInGroupFunction,
  departmentStreamHandlerFunction,
  preTokenGenerationFunction,
  assetToolCreate,
  assetKbSearch,
  assetToolUpdate,
  assetToolDelete,
  assetToolList,
  assetToolGet,
  assetTypeToolList,
  assetTypeToolCreate,
  syncAsset,
  requestToolCreate,
  requestKbSearch,
  requestToolGet,
  requestToolList,
  requestToolUpdate,
  requestTypeToolList,
  syncRequest,
});

// Backend型をエクスポート
export type BackendType = typeof backend;

// Pipelineはbranch、sandboxは--identifierを物理resource名へ反映する。
const backendName = backend.stack.node.getContext("amplify-backend-name");
if (typeof backendName !== "string") {
  throw new Error("Amplify backend name context is required");
}
const branchName = process.env.AWS_BRANCH || backendName;
const pathPrefix = `workops-suite-${branchName}`;
const policyDeploymentKey = createHash("sha256")
  .update(backendName)
  .digest("hex")
  .slice(0, 8);

// ==================================================
// Managed Harness、業務Tool Gateway、Cedar
// ==================================================
const toolLambdaList = [
  backend.assetToolCreate.resources.lambda,
  backend.assetKbSearch.resources.lambda,
  backend.assetToolUpdate.resources.lambda,
  backend.assetToolDelete.resources.lambda,
  backend.assetToolList.resources.lambda,
  backend.assetToolGet.resources.lambda,
  backend.assetTypeToolList.resources.lambda,
  backend.assetTypeToolCreate.resources.lambda,
  backend.requestToolCreate.resources.lambda,
  backend.requestKbSearch.resources.lambda,
  backend.requestToolGet.resources.lambda,
  backend.requestToolList.resources.lambda,
  backend.requestToolUpdate.resources.lambda,
  backend.requestTypeToolList.resources.lambda,
];

const agentCoreStack = backend.createStack("AgentCoreStack");
const userPoolId = backend.auth.resources.userPool.userPoolId;
const userPool = backend.auth.resources.userPool;
const cfnUserPoolClient = backend.auth.resources.cfnResources.cfnUserPoolClient;
const cognitoIssuer = `https://cognito-idp.${agentCoreStack.region}.amazonaws.com/${userPoolId}`;
const cognitoDiscoveryUrl = `${cognitoIssuer}/.well-known/openid-configuration`;

const policyEngine = new PolicyEngine(agentCoreStack, "PolicyEngine", {
  // Policy Engine names accept underscores, but not the hyphens used by the
  // surrounding resource names. This does not alter Harness/Gateway names.
  policyEngineName: `${pathPrefix.replaceAll("-", "_")}_tool_policy`,
});
const toolGateway = new ToolGateway(agentCoreStack, "ToolGateway", {
  gatewayName: `${pathPrefix}-tools`,
  toolFunctions: toolLambdaList,
  policyEngineArn: policyEngine.policyEngineArn,
  policyMode: gatewayPolicyMode,
});
const agentHarness = new AgentHarness(agentCoreStack, "Harness", {
  harnessName: `${pathPrefix.replace(/-/g, "_")}_harness`,
  gatewayArn: toolGateway.gateway.gatewayArn,
  discoveryUrl: cognitoDiscoveryUrl,
  allowedClientIds: [cfnUserPoolClient.ref],
  allowedScope: "workops-agent/invoke",
});

const bffFunction = backend.agentcoreBff;
const bffLambda = bffFunction.resources.lambda;
bffFunction.addEnvironment("HARNESS_ARN", agentHarness.harnessArn);
bffFunction.addEnvironment("MANAGED_MEMORY_ARN", agentHarness.memoryArn);
bffLambda.addToRolePolicy(
  new PolicyStatement({
    actions: [
      "bedrock-agentcore:ListSessions",
      "bedrock-agentcore:ListEvents",
      "bedrock-agentcore:DeleteEvent",
    ],
    resources: [agentHarness.memoryArn],
  }),
);
const agentApiStack = backend.createStack("AgentApiStack");
const agentRestApi = new AgentRestApi(agentApiStack, "AgentRestApi", {
  bff: bffLambda,
  userPool: backend.auth.resources.userPool,
});

// 各関数に環境変数を設定
[
  backend.listUsersFunction,
  backend.getUserFunction,
  backend.createUserFunction,
  backend.setUserEnabledFunction,
  backend.deleteUserFunction,
].forEach((func) => {
  func.addEnvironment("USER_POOL_ID", userPoolId);
});

[
  backend.listGroupsFunction,
  backend.createGroupFunction,
  backend.deleteGroupFunction,
  backend.addUserToGroupFunction,
  backend.removeUserFromGroupFunction,
  backend.listGroupsForUserFunction,
  backend.listUsersInGroupFunction,
].forEach((func) => {
  func.addEnvironment("USER_POOL_ID", userPoolId);
});

backend.departmentStreamHandlerFunction.addEnvironment("USER_POOL_ID", userPoolId);

// Auth設定（Cognito User Poolなど）を適用
setupAuth(backend, pathPrefix);

// ==================================================
// IAM: グループ操作関数に Cognito 権限を付与
// ==================================================
const groupOperationActions = [
  "cognito-idp:ListGroups",
  "cognito-idp:CreateGroup",
  "cognito-idp:DeleteGroup",
  "cognito-idp:AdminAddUserToGroup",
  "cognito-idp:AdminRemoveUserFromGroup",
  "cognito-idp:AdminListGroupsForUser",
  "cognito-idp:ListUsersInGroup",
];

const userOperationActions = [
  "cognito-idp:ListUsers",
  "cognito-idp:AdminGetUser",
  "cognito-idp:AdminCreateUser",
  "cognito-idp:AdminEnableUser",
  "cognito-idp:AdminDisableUser",
  "cognito-idp:AdminDeleteUser",
];

// ===========================================
// DynamoDB Stream接続 (Department -> Cognito Group Sync)
// ===========================================
const departmentTable = backend.data.resources.tables["Department"];
const departmentStreamHandlerLambda =
  backend.departmentStreamHandlerFunction.resources.lambda;

// DynamoDB Stream接続
departmentStreamHandlerLambda.addEventSource(
  new DynamoEventSource(departmentTable, {
    startingPosition: StartingPosition.LATEST,
    batchSize: 10,
    retryAttempts: 3,
  }),
);

departmentStreamHandlerLambda.addToRolePolicy(
  new iam.PolicyStatement({
    actions: ["cognito-idp:CreateGroup", "cognito-idp:DeleteGroup"],
    resources: [userPool.userPoolArn],
  }),
);

[
  backend.listGroupsFunction,
  backend.createGroupFunction,
  backend.deleteGroupFunction,
  backend.addUserToGroupFunction,
  backend.removeUserFromGroupFunction,
  backend.listGroupsForUserFunction,
  backend.listUsersInGroupFunction,
].forEach((func) => {
  func.resources.lambda.addToRolePolicy(
    new iam.PolicyStatement({
      actions: groupOperationActions,
      resources: [userPool.userPoolArn],
    }),
  );
});

// ==================================================
// IAM: ユーザー操作関数に Cognito 権限を付与
// ==================================================
[
  backend.listUsersFunction,
  backend.getUserFunction,
  backend.createUserFunction,
  backend.setUserEnabledFunction,
  backend.deleteUserFunction,
].forEach((func) => {
  func.resources.lambda.addToRolePolicy(
    new iam.PolicyStatement({
      actions: userOperationActions,
      resources: [userPool.userPoolArn],
    }),
  );
});

// ==================================================
// Vector Store + Bedrock Knowledge Base (Asset / Request)
// ==================================================
const assetVectorStoreStack = backend.createStack("AssetVectorStoreStack");
const assetVectorStoreResources = new AssetVectorStoreResources(
  assetVectorStoreStack,
  "AssetVectorStoreResources",
);

// Asset / Request 共通の Bedrock KB スタック（1バケット・1VectorStore・1KB・2DS）
const assetBedrockStack = backend.createStack("AssetBedrockStack");
const assetBedrockResources = new AssetBedrockResources(
  assetBedrockStack,
  "AssetBedrockResources",
  {
    dataSourceBucketArn: backend.assetStorage.resources.bucket.bucketArn,
    vectorStoreBucketArn: assetVectorStoreResources.vectorStoreBucketArn,
    vectorStoreIndexArn: assetVectorStoreResources.vectorIndexArn,
    region: backend.stack.region,
    account: backend.stack.account,
    branchName,
  },
);

const assetTable = backend.data.resources.tables["Asset"];
const requestTable = backend.data.resources.tables["Request"];

// sync LambdaにDynamoDB Streamを接続
backend.syncAsset.resources.lambda.addEventSource(
  new DynamoEventSource(assetTable, {
    startingPosition: StartingPosition.LATEST,
    batchSize: 10,
    retryAttempts: 3,
  }),
);

backend.syncRequest.resources.lambda.addEventSource(
  new DynamoEventSource(requestTable, {
    startingPosition: StartingPosition.LATEST,
    batchSize: 10,
    retryAttempts: 3,
  }),
);

backend.assetStorage.resources.bucket.grantReadWrite(backend.syncAsset.resources.lambda);
// syncRequest も統合バケットへの読み書き権限を付与
backend.assetStorage.resources.bucket.grantReadWrite(
  backend.syncRequest.resources.lambda,
);

// sync LambdaにKB取り込みジョブ実行権限を付与
[backend.syncAsset, backend.syncRequest].forEach((func) => {
  func.resources.lambda.addToRolePolicy(
    new PolicyStatement({
      actions: ["bedrock:StartIngestionJob", "bedrock:ListIngestionJobs"],
      resources: [
        `arn:aws:bedrock:${backend.stack.region}:${backend.stack.account}:knowledge-base/*`,
      ],
    }),
  );
});

// sync Lambda環境変数設定（Asset）
backend.syncAsset.addEnvironment(
  "DATA_SOURCE_BUCKET_NAME",
  backend.assetStorage.resources.bucket.bucketName,
);
backend.syncAsset.addEnvironment(
  "KNOWLEDGE_BASE_ID",
  assetBedrockResources.knowledgeBaseId,
);
backend.syncAsset.addEnvironment("DATA_SOURCE_ID", assetBedrockResources.assetDataSourceId);

// sync Lambda環境変数設定（Request）— 統合バケット・統合KB・Request専用DS
backend.syncRequest.addEnvironment(
  "DATA_SOURCE_BUCKET_NAME",
  backend.assetStorage.resources.bucket.bucketName,
);
backend.syncRequest.addEnvironment(
  "KNOWLEDGE_BASE_ID",
  assetBedrockResources.knowledgeBaseId,
);
backend.syncRequest.addEnvironment(
  "DATA_SOURCE_ID",
  assetBedrockResources.requestDataSourceId,
);

// kb-search Lambda環境変数設定（両者とも統合KB）
backend.assetKbSearch.addEnvironment(
  "KNOWLEDGE_BASE_ID",
  assetBedrockResources.knowledgeBaseId,
);
backend.requestKbSearch.addEnvironment(
  "KNOWLEDGE_BASE_ID",
  assetBedrockResources.knowledgeBaseId,
);

// kb-search LambdaにRetrieve権限を付与（統合KB）
[backend.assetKbSearch, backend.requestKbSearch].forEach((fn) => {
  fn.resources.lambda.addToRolePolicy(
    new PolicyStatement({
      actions: ["bedrock:Retrieve"],
      resources: [
        `arn:aws:bedrock:${backend.stack.region}:${backend.stack.account}:knowledge-base/${assetBedrockResources.knowledgeBaseId}`,
      ],
    }),
  );
});

// ==================================================
// AgentCore Gateway ツール登録（Asset / Request）
// ==================================================
const assetGatewayTargetsStack = backend.createStack("AssetGatewayTargetsStack");
const requestGatewayTargetsStack = backend.createStack("RequestGatewayTargetsStack");

createAssetGatewayTargets({
  scope: assetGatewayTargetsStack,
  gatewayArn: toolGateway.gateway.gatewayArn,
  gatewayId: toolGateway.gateway.gatewayId,
  gatewayName: toolGateway.gateway.gatewayName,
  gatewayRoleArn: toolGateway.gateway.role.roleArn,
  assetCreateLambda: backend.assetToolCreate.resources.lambda,
  assetKbSearchLambda: backend.assetKbSearch.resources.lambda,
  assetUpdateLambda: backend.assetToolUpdate.resources.lambda,
  assetDeleteLambda: backend.assetToolDelete.resources.lambda,
  assetListLambda: backend.assetToolList.resources.lambda,
  assetGetLambda: backend.assetToolGet.resources.lambda,
  assetTypeListLambda: backend.assetTypeToolList.resources.lambda,
  assetTypeCreateLambda: backend.assetTypeToolCreate.resources.lambda,
});

createRequestGatewayTargets({
  scope: requestGatewayTargetsStack,
  gatewayArn: toolGateway.gateway.gatewayArn,
  gatewayId: toolGateway.gateway.gatewayId,
  gatewayName: toolGateway.gateway.gatewayName,
  gatewayRoleArn: toolGateway.gateway.role.roleArn,
  requestCreateLambda: backend.requestToolCreate.resources.lambda,
  requestKbSearchLambda: backend.requestKbSearch.resources.lambda,
  requestGetLambda: backend.requestToolGet.resources.lambda,
  requestListLambda: backend.requestToolList.resources.lambda,
  requestUpdateLambda: backend.requestToolUpdate.resources.lambda,
  requestTypeListLambda: backend.requestTypeToolList.resources.lambda,
});
assetGatewayTargetsStack.addStackDependency(agentCoreStack);
requestGatewayTargetsStack.addStackDependency(agentCoreStack);

// Cedar validation must run after all Gateway targets exist, because the policy
// analyzer resolves the exact target___tool actions during policy creation.
const gatewayPolicyDefinitions = allowedToolNames.flatMap((toolName) =>
  createGatewayPolicyDefinitions(
    toolGateway.gateway.gatewayArn,
    toolName,
    agentHarness.gatewayPrincipalId,
    policyDeploymentKey,
  ),
);
const gatewayPolicyStack = backend.createStack("GatewayPolicyStack");
createGatewayPolicyResources(gatewayPolicyStack, "GatewayPolicy", {
  policyEngineId: policyEngine.policyEngineId,
  definitions: gatewayPolicyDefinitions,
});
gatewayPolicyStack.addStackDependency(agentCoreStack);
gatewayPolicyStack.addStackDependency(assetGatewayTargetsStack);
gatewayPolicyStack.addStackDependency(requestGatewayTargetsStack);

// ==================================================
// カスタム出力: Browser向けAgent API URL
// ==================================================
backend.addOutput({
  custom: {
    agentRestApiUrl: agentRestApi.api.url,
  },
});
