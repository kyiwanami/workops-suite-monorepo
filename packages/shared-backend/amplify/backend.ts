import { defineBackend } from "@aws-amplify/backend";
import { aws_iam as iam } from "aws-cdk-lib";
import { PolicyStatement } from "aws-cdk-lib/aws-iam";
import { StartingPosition } from "aws-cdk-lib/aws-lambda";
import { DynamoEventSource } from "aws-cdk-lib/aws-lambda-event-sources";
import { Provider } from "aws-cdk-lib/custom-resources";
import { auth, setupAuth } from "./auth/resource";
import { data } from "./data/resource";
import { AgentCoreInfrastructure } from "./bedrock-agentcore/constructs/agent-infra";
import { AgentCoreStack } from "./bedrock-agentcore/runtime-stack";
import { PolicyEngine } from "./bedrock-agentcore/constructs/policy-engine";
import { WebSearchApiKeyProvider } from "./bedrock-agentcore/constructs/web-search-api-key-provider";
import { assetStorage } from "./storage/resource";
import { VectorStoreResources as AssetVectorStoreResources } from "./s3vectors/asset/resource";
import { BedrockResources as AssetBedrockResources } from "./bedrock/asset/resource";

import { listUsersFunction } from "./function/user-operations/list-users/resource";
import { getUserFunction } from "./function/user-operations/get-user/resource";
import { createUserFunction } from "./function/user-operations/create-user/resource";
import { setUserEnabledFunction } from "./function/user-operations/set-user-enabled/resource";
import { deleteUserFunction } from "./function/user-operations/delete-user/resource";
import { registerCallbackUrlFunction } from "./function/register-callback-url/resource";

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
import { webSearchApiKeyProviderFunction } from "./function/web-search-api-key-provider/resource";

import { createGatewayTargets as createAssetGatewayTargets } from "./bedrock-agentcore/gateway/asset/resource";
import { createGatewayTargets as createRequestGatewayTargets } from "./bedrock-agentcore/gateway/request/resource";
import {
  createGatewayPolicyResources,
  createPolicyEngineAttachmentResource,
} from "./bedrock-agentcore/policy/resource";

// ブランチ名取得
// - Amplifyビルド時: AWS_BRANCH環境変数から取得
// - ローカルsandbox: 'sandbox'固定
const branchName = process.env.AWS_BRANCH || "sandbox";

// パスプレフィックス生成 (workops-suite-{branchName})
const pathPrefix = `workops-suite-${branchName}`;

const backend = defineBackend({
  auth,
  data,
  assetStorage,
  listUsersFunction,
  getUserFunction,
  createUserFunction,
  setUserEnabledFunction,
  deleteUserFunction,
  registerCallbackUrlFunction,
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
  webSearchApiKeyProviderFunction,
});

// Backend型をエクスポート
export type BackendType = typeof backend;

// ==================================================
// AgentCore Infrastructure（Gateway, Memory, Browser, Runtime, PolicyEngine）
// ==================================================
const userPoolIdForAgentCore = backend.auth.resources.userPool.userPoolId;
const userPoolClientIdForAgentCore = backend.auth.resources.userPoolClient.userPoolClientId;

const agentCoreInfraStack = backend.createStack("AgentCoreInfraStack");

const policyEngine = new PolicyEngine(agentCoreInfraStack, "PolicyEngine", {
  projectPathPrefix: pathPrefix,
});

const agentCoreInfrastructure = new AgentCoreInfrastructure(
  agentCoreInfraStack,
  "Infrastructure",
  {
    projectPathPrefix: pathPrefix,
    userPoolId: userPoolIdForAgentCore,
    userPoolClientId: userPoolClientIdForAgentCore,
    policyEngineArn: policyEngine.policyEngineArn,
  },
);

new WebSearchApiKeyProvider(
  agentCoreInfraStack,
  "WebSearchApiKeyProvider",
  {
    projectPathPrefix: pathPrefix,
    apiKeyValue: "DUMMY", // Users update via AWS Console
    onEventHandler: backend.webSearchApiKeyProviderFunction.resources.lambda,
  },
);

const agentCoreRuntimeStack = backend.createStack("AgentCoreRuntimeStack");
const agentCoreRuntime = new AgentCoreStack(agentCoreRuntimeStack, "AgentCore", {
  projectPathPrefix: pathPrefix,
  region: backend.stack.region,
  userPoolId: userPoolIdForAgentCore,
  userPoolClientId: userPoolClientIdForAgentCore,
  gateway: agentCoreInfrastructure.gateway,
  memory: agentCoreInfrastructure.memory,
  browser: agentCoreInfrastructure.browser,
});
agentCoreRuntimeStack.addDependency(agentCoreInfraStack);

// 各関数に環境変数を設定
const userPoolId = backend.auth.resources.userPool.userPoolId;

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
// IAM: 認証済みユーザーに AgentCore 実行権限を付与
// ==================================================
backend.auth.resources.authenticatedUserIamRole.addToPrincipalPolicy(
  new PolicyStatement({
    actions: ["bedrock-agentcore:InvokeAgentRuntime"],
    resources: ["*"],
  }),
);

const userPool = backend.auth.resources.userPool;

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
const attachPolicyEngineStack = backend.createStack("AttachPolicyEngineStack");
const assetGatewayPolicyStack = backend.createStack("AssetGatewayPolicyStack");
const requestGatewayPolicyStack = backend.createStack("RequestGatewayPolicyStack");

const assetPolicies = createAssetGatewayTargets({
  scope: assetGatewayTargetsStack,
  gatewayArn: agentCoreInfrastructure.gateway.gatewayArn,
  gatewayId: agentCoreInfrastructure.gateway.gatewayId,
  gatewayName: agentCoreInfrastructure.gatewayName,
  gatewayRoleArn: agentCoreInfrastructure.gateway.role.roleArn,
  assetCreateLambda: backend.assetToolCreate.resources.lambda,
  assetKbSearchLambda: backend.assetKbSearch.resources.lambda,
  assetUpdateLambda: backend.assetToolUpdate.resources.lambda,
  assetDeleteLambda: backend.assetToolDelete.resources.lambda,
  assetListLambda: backend.assetToolList.resources.lambda,
  assetGetLambda: backend.assetToolGet.resources.lambda,
  assetTypeListLambda: backend.assetTypeToolList.resources.lambda,
  assetTypeCreateLambda: backend.assetTypeToolCreate.resources.lambda,
});

const requestPolicies = createRequestGatewayTargets({
  scope: requestGatewayTargetsStack,
  gatewayArn: agentCoreInfrastructure.gateway.gatewayArn,
  gatewayId: agentCoreInfrastructure.gateway.gatewayId,
  gatewayName: agentCoreInfrastructure.gatewayName,
  gatewayRoleArn: agentCoreInfrastructure.gateway.role.roleArn,
  requestCreateLambda: backend.requestToolCreate.resources.lambda,
  requestKbSearchLambda: backend.requestKbSearch.resources.lambda,
  requestGetLambda: backend.requestToolGet.resources.lambda,
  requestListLambda: backend.requestToolList.resources.lambda,
  requestUpdateLambda: backend.requestToolUpdate.resources.lambda,
  requestTypeListLambda: backend.requestTypeToolList.resources.lambda,
});

const policyEngineAttachmentResource = createPolicyEngineAttachmentResource({
  scope: attachPolicyEngineStack,
  branchName,
  gatewayId: agentCoreInfrastructure.gateway.gatewayId,
  gatewayRoleArn: agentCoreInfrastructure.gateway.role.roleArn,
  policyEngineArn: policyEngine.policyEngineArn,
});

createGatewayPolicyResources({
  scope: assetGatewayPolicyStack,
  branchName,
  gatewayArn: agentCoreInfrastructure.gateway.gatewayArn,
  policyEngineId: policyEngine.policyEngineId,
  policies: assetPolicies,
  attachmentDependency: policyEngineAttachmentResource,
});

createGatewayPolicyResources({
  scope: requestGatewayPolicyStack,
  branchName,
  gatewayArn: agentCoreInfrastructure.gateway.gatewayArn,
  policyEngineId: policyEngine.policyEngineId,
  policies: requestPolicies,
  attachmentDependency: policyEngineAttachmentResource,
});

attachPolicyEngineStack.addDependency(assetGatewayTargetsStack);
attachPolicyEngineStack.addDependency(requestGatewayTargetsStack);
assetGatewayPolicyStack.addDependency(attachPolicyEngineStack);
requestGatewayPolicyStack.addDependency(attachPolicyEngineStack);

// ==================================================
// カスタム出力: AgentCore Runtime ARN
// ==================================================
backend.addOutput({
  custom: {
    agentCoreRuntimeArn: agentCoreRuntime.runtimeArn,
  },
});

// ==================================================
// CustomResource: サブシステムからのCallback URL登録
// ==================================================
// サンドボックス環境では不要
if (process.env.AWS_BRANCH) {
  // Lambda関数にCognito操作権限を付与
  backend.registerCallbackUrlFunction.resources.lambda.addToRolePolicy(
    new iam.PolicyStatement({
      actions: [
        "cognito-idp:DescribeUserPoolClient",
        "cognito-idp:UpdateUserPoolClient",
      ],
      resources: [userPool.userPoolArn],
    }),
  );

  // CustomResource Provider作成
  new Provider(backend.stack, "CallbackUrlProvider", {
    onEventHandler: backend.registerCallbackUrlFunction.resources.lambda,
  });
}
