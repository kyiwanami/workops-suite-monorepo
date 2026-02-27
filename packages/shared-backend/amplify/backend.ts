import { defineBackend } from "@aws-amplify/backend";
import { aws_iam as iam } from "aws-cdk-lib";
import { PolicyStatement } from "aws-cdk-lib/aws-iam";
import { StartingPosition } from "aws-cdk-lib/aws-lambda";
import { DynamoEventSource } from "aws-cdk-lib/aws-lambda-event-sources";
import { Provider } from "aws-cdk-lib/custom-resources";
import { CustomResource } from "aws-cdk-lib";
import { createAuthResource } from "./auth/resource";
import { data } from "./data/resource";
import { createParameterStore } from "./ssm/resource";
import { storage } from "./storage/resource";
import { VectorStoreResources } from "./s3vectors/resource";
import { BedrockResources } from "./bedrock/resource";
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
import { attachPreTokenTriggerFunction } from "./function/attach-pre-token-trigger/resource";

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
import { registerCallbackUrlFunction } from "./function/register-callback-url/resource";

import { createGatewayTargets as createAssetGatewayTargets } from "./bedrock-agentcore/gateway/asset/resource";
import { createGatewayTargets as createRequestGatewayTargets } from "./bedrock-agentcore/gateway/request/resource";

// ブランチ名取得
// - Amplifyビルド時: AWS_BRANCH環境変数から取得
// - ローカルsandbox: 'sandbox'固定
const branchName = process.env.AWS_BRANCH || "sandbox";

// パスプレフィックス生成 (workops-suite-{branchName})
const pathPrefix = `workops-suite-${branchName}`;

// SSMからAgentCore設定を取得
const params = await createParameterStore(pathPrefix);

const backend = defineBackend({
  auth: createAuthResource(params),
  data,
  storage,
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
  attachPreTokenTriggerFunction,
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
  registerCallbackUrlFunction,
});

// Backend型をエクスポート
export type BackendType = typeof backend;

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
const preTokenGenerationLambda = backend.preTokenGenerationFunction.resources.lambda;

// ==================================================
// Cognito: Pre Token Generation Triggerアタッチ
// ==================================================
preTokenGenerationLambda.addPermission("AllowCognitoInvokePreTokenGeneration", {
  principal: new iam.ServicePrincipal("cognito-idp.amazonaws.com"),
  sourceArn: userPool.userPoolArn,
  action: "lambda:InvokeFunction",
});

backend.attachPreTokenTriggerFunction.resources.lambda.addToRolePolicy(
  new iam.PolicyStatement({
    actions: ["cognito-idp:DescribeUserPool", "cognito-idp:UpdateUserPool"],
    resources: [userPool.userPoolArn],
  }),
);

const preTokenTriggerProvider = new Provider(backend.stack, "PreTokenTriggerProvider", {
  onEventHandler: backend.attachPreTokenTriggerFunction.resources.lambda,
});

new CustomResource(backend.stack, "AttachPreTokenTrigger", {
  serviceToken: preTokenTriggerProvider.serviceToken,
  properties: {
    UserPoolId: userPool.userPoolId,
    TriggerLambdaArn: preTokenGenerationLambda.functionArn,
  },
});

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
const vectorStoreStack = backend.createStack("VectorStoreStack");
const vectorStoreResources = new VectorStoreResources(
  vectorStoreStack,
  "VectorStoreResources",
);

const bedrockStack = backend.createStack("BedrockStack");
const bedrockResources = new BedrockResources(
  bedrockStack,
  "BedrockResources",
  {
    dataSourceBucketArn: backend.storage.resources.bucket.bucketArn,
    vectorStoreBucketArn: vectorStoreResources.vectorStoreBucketArn,
    vectorStoreIndexArn: vectorStoreResources.vectorIndexArn,
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

backend.storage.resources.bucket.grantReadWrite(backend.syncAsset.resources.lambda);
backend.storage.resources.bucket.grantReadWrite(backend.syncRequest.resources.lambda);

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
  backend.storage.resources.bucket.bucketName,
);
backend.syncAsset.addEnvironment(
  "KNOWLEDGE_BASE_ID",
  bedrockResources.knowledgeBaseId,
);
backend.syncAsset.addEnvironment("DATA_SOURCE_ID", bedrockResources.dataSourceId);

// sync Lambda環境変数設定（Request）
backend.syncRequest.addEnvironment(
  "DATA_SOURCE_BUCKET_NAME",
  backend.storage.resources.bucket.bucketName,
);
backend.syncRequest.addEnvironment(
  "KNOWLEDGE_BASE_ID",
  bedrockResources.knowledgeBaseId,
);
backend.syncRequest.addEnvironment(
  "DATA_SOURCE_ID",
  bedrockResources.dataSourceId,
);

// kb-search Lambda環境変数設定
backend.assetKbSearch.addEnvironment(
  "KNOWLEDGE_BASE_ID",
  bedrockResources.knowledgeBaseId,
);
backend.requestKbSearch.addEnvironment(
  "KNOWLEDGE_BASE_ID",
  bedrockResources.knowledgeBaseId,
);

// kb-search LambdaにRetrieve権限を付与
[
  { fn: backend.assetKbSearch, kbId: bedrockResources.knowledgeBaseId },
  { fn: backend.requestKbSearch, kbId: bedrockResources.knowledgeBaseId },
].forEach(({ fn, kbId }) => {
  fn.resources.lambda.addToRolePolicy(
    new PolicyStatement({
      actions: ["bedrock:Retrieve"],
      resources: [
        `arn:aws:bedrock:${backend.stack.region}:${backend.stack.account}:knowledge-base/${kbId}`,
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
  gatewayArn: params.GATEWAY_ARN,
  gatewayId: params.GATEWAY_ID,
  gatewayName: params.GATEWAY_NAME,
  gatewayRoleArn: params.GATEWAY_ROLE_ARN,
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
  gatewayArn: params.GATEWAY_ARN,
  gatewayId: params.GATEWAY_ID,
  gatewayName: params.GATEWAY_NAME,
  gatewayRoleArn: params.GATEWAY_ROLE_ARN,
  requestCreateLambda: backend.requestToolCreate.resources.lambda,
  requestKbSearchLambda: backend.requestKbSearch.resources.lambda,
  requestGetLambda: backend.requestToolGet.resources.lambda,
  requestListLambda: backend.requestToolList.resources.lambda,
  requestUpdateLambda: backend.requestToolUpdate.resources.lambda,
  requestTypeListLambda: backend.requestTypeToolList.resources.lambda,
});

// ==================================================
// カスタム出力: AgentCore Runtime ARN
// ==================================================
// Runtime ARNはSSMから取得した値を出力
backend.addOutput({
  custom: {
    agentCoreRuntimeArn: params.RUNTIME_ARN,
  },
});
