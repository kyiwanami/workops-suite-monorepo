import {
  Gateway,
  GatewayTarget,
} from "@aws-cdk/aws-bedrock-agentcore-alpha";
import { Role } from "aws-cdk-lib/aws-iam";
import { CfnPermission } from "aws-cdk-lib/aws-lambda";
import type { IFunction } from "aws-cdk-lib/aws-lambda";
import { Construct, IConstruct } from "constructs";
import {
  createGatewayPolicyDefinition,
  GatewayPolicyDefinition,
} from "../../policy/policy-statements";
import {
  approveRequestToolSchema,
  createRequestToolSchema,
  getRequestToolSchema,
  listRequestTypesToolSchema,
  listRequestsToolSchema,
  rejectRequestToolSchema,
  returnRequestToolSchema,
  searchRequestKnowledgeBaseToolSchema,
  submitRequestToolSchema,
  updateRequestToolSchema,
  withdrawRequestToolSchema,
} from "./tool-schemas";

export interface CreateGatewayTargetsProps {
  scope: Construct;
  gatewayArn: string;
  gatewayId: string;
  gatewayName: string;
  gatewayRoleArn: string;
  requestCreateLambda: IFunction;
  requestKbSearchLambda: IFunction;
  requestGetLambda: IFunction;
  requestListLambda: IFunction;
  requestUpdateLambda: IFunction;
  requestTypeListLambda: IFunction;
}

// AgentCore Gateway にターゲット（ツール）を登録する
export function createGatewayTargets(
  props: CreateGatewayTargetsProps,
): GatewayPolicyDefinition[] {
  const {
    scope,
    gatewayArn,
    gatewayId,
    gatewayName,
    gatewayRoleArn,
    requestCreateLambda,
    requestKbSearchLambda,
    requestGetLambda,
    requestListLambda,
    requestUpdateLambda,
    requestTypeListLambda,
  } = props;

  const gateway = Gateway.fromGatewayAttributes(scope, "ImportedGateway", {
    gatewayArn,
    gatewayId,
    gatewayName,
    role: Role.fromRoleArn(scope, "ImportedGatewayRole", gatewayRoleArn, {
      mutable: false,
    }),
  });

  const roleDefaultPolicy = gateway.role.node.tryFindChild("DefaultPolicy");
  const policies: GatewayPolicyDefinition[] = [];

  // IAMポリシー反映待ちを避けるため、Lambdaリソースポリシーを先に作成する
  const createRequestPermission = new CfnPermission(
    scope,
    "RequestCreateGatewayPermission",
    {
      action: "lambda:InvokeFunction",
      functionName: requestCreateLambda.functionArn,
      principal: gatewayRoleArn,
      sourceArn: gatewayArn,
    },
  );

  const createRequestDependencies: IConstruct[] = [createRequestPermission];
  if (roleDefaultPolicy) {
    createRequestDependencies.push(roleDefaultPolicy);
  }

  const createRequestTarget = GatewayTarget.forLambda(
    scope,
    "CreateRequestTarget",
    {
      gateway,
      lambdaFunction: requestCreateLambda,
      toolSchema: createRequestToolSchema,
      gatewayTargetName: "create-request",
      description: "Creates a new Request",
    },
  );
  createRequestTarget.node.addDependency(...createRequestDependencies);
  policies.push(
    createGatewayPolicyDefinition(gatewayArn, createRequestTarget.name, [
      "editor",
      "manager",
    ]),
  );

  const kbSearchPermission = new CfnPermission(
    scope,
    "RequestKbSearchGatewayPermission",
    {
      action: "lambda:InvokeFunction",
      functionName: requestKbSearchLambda.functionArn,
      principal: gatewayRoleArn,
      sourceArn: gatewayArn,
    },
  );

  const kbSearchDependencies: IConstruct[] = [kbSearchPermission];
  if (roleDefaultPolicy) {
    kbSearchDependencies.push(roleDefaultPolicy);
  }

  const kbSearchTarget = GatewayTarget.forLambda(scope, "SearchRequestTarget", {
    gateway,
    lambdaFunction: requestKbSearchLambda,
    toolSchema: searchRequestKnowledgeBaseToolSchema,
    gatewayTargetName: "search-request-knowledge-base",
    description: "Searches the request knowledge base",
  });
  kbSearchTarget.node.addDependency(...kbSearchDependencies);
  policies.push(
    createGatewayPolicyDefinition(gatewayArn, kbSearchTarget.name, [
      "viewer",
      "editor",
      "manager",
    ]),
  );

  const getRequestPermission = new CfnPermission(
    scope,
    "RequestGetGatewayPermission",
    {
      action: "lambda:InvokeFunction",
      functionName: requestGetLambda.functionArn,
      principal: gatewayRoleArn,
      sourceArn: gatewayArn,
    },
  );
  const getRequestDependencies: IConstruct[] = [getRequestPermission];
  if (roleDefaultPolicy) {
    getRequestDependencies.push(roleDefaultPolicy);
  }
  const getRequestTarget = GatewayTarget.forLambda(scope, "GetRequestTarget", {
    gateway,
    lambdaFunction: requestGetLambda,
    toolSchema: getRequestToolSchema,
    gatewayTargetName: "get-request",
    description: "Gets a single Request by ID",
  });
  getRequestTarget.node.addDependency(...getRequestDependencies);
  policies.push(
    createGatewayPolicyDefinition(gatewayArn, getRequestTarget.name, [
      "viewer",
      "editor",
      "manager",
    ]),
  );

  const listRequestsPermission = new CfnPermission(
    scope,
    "RequestListGatewayPermission",
    {
      action: "lambda:InvokeFunction",
      functionName: requestListLambda.functionArn,
      principal: gatewayRoleArn,
      sourceArn: gatewayArn,
    },
  );
  const listRequestsDependencies: IConstruct[] = [listRequestsPermission];
  if (roleDefaultPolicy) {
    listRequestsDependencies.push(roleDefaultPolicy);
  }
  const listRequestsTarget = GatewayTarget.forLambda(
    scope,
    "ListRequestsTarget",
    {
      gateway,
      lambdaFunction: requestListLambda,
      toolSchema: listRequestsToolSchema,
      gatewayTargetName: "list-requests",
      description: "Lists Requests with GSI filtering",
    },
  );
  listRequestsTarget.node.addDependency(...listRequestsDependencies);
  policies.push(
    createGatewayPolicyDefinition(gatewayArn, listRequestsTarget.name, [
      "viewer",
      "editor",
      "manager",
    ]),
  );

  const updateRequestPermission = new CfnPermission(
    scope,
    "RequestUpdateGatewayPermission",
    {
      action: "lambda:InvokeFunction",
      functionName: requestUpdateLambda.functionArn,
      principal: gatewayRoleArn,
      sourceArn: gatewayArn,
    },
  );
  const updateRequestDependencies: IConstruct[] = [updateRequestPermission];
  if (roleDefaultPolicy) {
    updateRequestDependencies.push(roleDefaultPolicy);
  }

  const updateRequestTarget = GatewayTarget.forLambda(
    scope,
    "UpdateRequestTarget",
    {
      gateway,
      lambdaFunction: requestUpdateLambda,
      toolSchema: updateRequestToolSchema,
      gatewayTargetName: "update-request",
      description: "Updates Request fields",
    },
  );
  updateRequestTarget.node.addDependency(...updateRequestDependencies);
  policies.push(
    createGatewayPolicyDefinition(gatewayArn, updateRequestTarget.name, [
      "editor",
      "manager",
    ]),
  );

  const submitRequestTarget = GatewayTarget.forLambda(
    scope,
    "SubmitRequestTarget",
    {
      gateway,
      lambdaFunction: requestUpdateLambda,
      toolSchema: submitRequestToolSchema,
      gatewayTargetName: "submit-request",
      description: "Submits a Request",
    },
  );
  submitRequestTarget.node.addDependency(...updateRequestDependencies);
  policies.push(
    createGatewayPolicyDefinition(gatewayArn, submitRequestTarget.name, [
      "editor",
      "manager",
    ]),
  );

  const withdrawRequestTarget = GatewayTarget.forLambda(
    scope,
    "WithdrawRequestTarget",
    {
      gateway,
      lambdaFunction: requestUpdateLambda,
      toolSchema: withdrawRequestToolSchema,
      gatewayTargetName: "withdraw-request",
      description: "Withdraws a Request",
    },
  );
  withdrawRequestTarget.node.addDependency(...updateRequestDependencies);
  policies.push(
    createGatewayPolicyDefinition(gatewayArn, withdrawRequestTarget.name, [
      "editor",
      "manager",
    ]),
  );

  const approveRequestTarget = GatewayTarget.forLambda(
    scope,
    "ApproveRequestTarget",
    {
      gateway,
      lambdaFunction: requestUpdateLambda,
      toolSchema: approveRequestToolSchema,
      gatewayTargetName: "approve-request",
      description: "Approves a Request",
    },
  );
  approveRequestTarget.node.addDependency(...updateRequestDependencies);
  policies.push(
    createGatewayPolicyDefinition(gatewayArn, approveRequestTarget.name, ["manager"]),
  );

  const rejectRequestTarget = GatewayTarget.forLambda(
    scope,
    "RejectRequestTarget",
    {
      gateway,
      lambdaFunction: requestUpdateLambda,
      toolSchema: rejectRequestToolSchema,
      gatewayTargetName: "reject-request",
      description: "Rejects a Request",
    },
  );
  rejectRequestTarget.node.addDependency(...updateRequestDependencies);
  policies.push(
    createGatewayPolicyDefinition(gatewayArn, rejectRequestTarget.name, ["manager"]),
  );

  const returnRequestTarget = GatewayTarget.forLambda(
    scope,
    "ReturnRequestTarget",
    {
      gateway,
      lambdaFunction: requestUpdateLambda,
      toolSchema: returnRequestToolSchema,
      gatewayTargetName: "return-request",
      description: "Returns a Request",
    },
  );
  returnRequestTarget.node.addDependency(...updateRequestDependencies);
  policies.push(
    createGatewayPolicyDefinition(gatewayArn, returnRequestTarget.name, ["manager"]),
  );

  const listRequestTypesPermission = new CfnPermission(
    scope,
    "RequestTypeListGatewayPermission",
    {
      action: "lambda:InvokeFunction",
      functionName: requestTypeListLambda.functionArn,
      principal: gatewayRoleArn,
      sourceArn: gatewayArn,
    },
  );
  const listRequestTypesDependencies: IConstruct[] = [listRequestTypesPermission];
  if (roleDefaultPolicy) {
    listRequestTypesDependencies.push(roleDefaultPolicy);
  }
  const listRequestTypesTarget = GatewayTarget.forLambda(
    scope,
    "ListRequestTypesTarget",
    {
      gateway,
      lambdaFunction: requestTypeListLambda,
      toolSchema: listRequestTypesToolSchema,
      gatewayTargetName: "list-request-types",
      description: "Lists active RequestType records",
    },
  );
  listRequestTypesTarget.node.addDependency(...listRequestTypesDependencies);
  policies.push(
    createGatewayPolicyDefinition(gatewayArn, listRequestTypesTarget.name, [
      "viewer",
      "editor",
      "manager",
    ]),
  );

  return policies;
}
