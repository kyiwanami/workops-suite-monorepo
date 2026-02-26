import { defineBackend } from "@aws-amplify/backend";
import { aws_iam as iam } from "aws-cdk-lib";
import { StartingPosition } from "aws-cdk-lib/aws-lambda";
import { DynamoEventSource } from "aws-cdk-lib/aws-lambda-event-sources";
import { auth, setupAuth } from "./auth/resource";
import { data } from "./data/resource";

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
import { PolicyStatement } from "aws-cdk-lib/aws-iam";

const backend = defineBackend({
  auth,
  data,
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
});

// Backend型をエクスポート
export type BackendType = typeof backend;

// ブランチ名取得
// - Amplifyビルド時: AWS_BRANCH環境変数から取得
// - ローカルsandbox: 'sandbox'固定
const branchName = process.env.AWS_BRANCH || "sandbox";

// パスプレフィックス生成 (workops-suite-{branchName})
const pathPrefix = `workops-suite-${branchName}`;

// Auth設定（Cognito User Poolなど）を適用
setupAuth(backend, pathPrefix);

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
  })
);

departmentStreamHandlerLambda.addToRolePolicy(
  new iam.PolicyStatement({
    actions: ["cognito-idp:CreateGroup", "cognito-idp:DeleteGroup"],
    resources: [backend.auth.resources.userPool.userPoolArn],
  })
);

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
      resources: [backend.auth.resources.userPool.userPoolArn],
    })
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
    new PolicyStatement({
      actions: userOperationActions,
      resources: [backend.auth.resources.userPool.userPoolArn],
    })
  );
});

// ==================================================
// カスタム出力: AgentCore Runtime ARN（ダミー値）
// ==================================================
// FIXME: 実際の AgentCore Runtime ARN が決まったら置き換える
backend.addOutput({
  custom: {
    agentCoreRuntimeArn:
      "arn:aws:bedrock-agentcore:ap-northeast-1:000000000000:runtime/dummy",
  },
});
