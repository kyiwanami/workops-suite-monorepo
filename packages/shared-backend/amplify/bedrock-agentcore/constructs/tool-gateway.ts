import { Construct } from "constructs";
import { Stack } from "aws-cdk-lib";
import {
  CfnGateway,
  Gateway,
  GatewayAuthorizer,
  GatewayProtocol,
  McpGatewaySearchType,
  MCPProtocolVersion,
} from "aws-cdk-lib/aws-bedrockagentcore";
import { gatewayMcpProtocolVersions } from "../tool-access";
import {
  CfnPolicy as IamCfnPolicy,
  Policy,
  PolicyStatement,
  Role,
  ServicePrincipal,
} from "aws-cdk-lib/aws-iam";
import type { IFunction } from "aws-cdk-lib/aws-lambda";
import {
  CfnDelivery,
  CfnDeliveryDestination,
  CfnDeliverySource,
} from "aws-cdk-lib/aws-logs";

interface ToolGatewayProps {
  gatewayName: string;
  toolFunctions: IFunction[];
  policyEngineArn: string;
  policyMode: string;
}

/**
 * Harness execution roleだけを受け付ける業務Lambda用の単一MCP Gatewayを定義する。
 */
export class ToolGateway extends Construct {
  public readonly gateway: Gateway;

  constructor(scope: Construct, id: string, props: ToolGatewayProps) {
    super(scope, id);

    const stack = Stack.of(this);
    const gatewaySourceArn = stack.formatArn({
      service: "bedrock-agentcore",
      resource: "gateway",
      resourceName: `${props.gatewayName}-*`,
    });
    const gatewayRole = new Role(this, "GatewayRole", {
      assumedBy: new ServicePrincipal("bedrock-agentcore.amazonaws.com", {
        conditions: {
          StringEquals: {
            "aws:SourceAccount": stack.account,
          },
          ArnLike: {
            "aws:SourceArn": gatewaySourceArn,
          },
        },
      }),
      description: "IAM role for the WorkOps business tool Gateway",
    });

    gatewayRole.addToPolicy(
      new PolicyStatement({
        actions: ["lambda:InvokeFunction"],
        resources: props.toolFunctions.map((toolFunction) =>
          toolFunction.functionArn,
        ),
      }),
    );

    // CloudFormationの既存論理IDを維持し、同名Gatewayの置換作成を防ぐ。
    this.gateway = new Gateway(this, "OAuthGateway", {
      gatewayName: props.gatewayName,
      role: gatewayRole,
      description: "WorkOps business tools",
      authorizerConfiguration: GatewayAuthorizer.usingAwsIam(),
      protocolConfiguration: GatewayProtocol.mcp({
        instructions: "WorkOps business tools for the Managed Harness agent",
        searchType: McpGatewaySearchType.SEMANTIC,
        supportedVersions: gatewayMcpProtocolVersions.map((version) =>
          MCPProtocolVersion.of(version),
        ),
      }),
    });

    // Gateway creation validates both resources before CloudFormation exposes
    // the generated Gateway ARN. Restrict the pre-create permission to this
    // immutable Gateway name prefix without referencing the resource token.
    const gatewayArnPattern = Stack.of(this).formatArn({
      service: "bedrock-agentcore",
      resource: "gateway",
      resourceName: `${props.gatewayName}-*`,
    });
    const authorizationPolicy = new Policy(this, "AuthorizationPolicy", {
      statements: [
        new PolicyStatement({
          actions: ["bedrock-agentcore:GetPolicyEngine"],
          resources: [props.policyEngineArn],
        }),
        new PolicyStatement({
          actions: [
            "bedrock-agentcore:AuthorizeAction",
            "bedrock-agentcore:PartiallyAuthorizeActions",
          ],
          resources: [props.policyEngineArn, gatewayArnPattern],
        }),
      ],
    });
    authorizationPolicy.attachToRole(gatewayRole);

    const gatewayResource = this.gateway.node.defaultChild;
    if (!(gatewayResource instanceof CfnGateway)) {
      throw new Error("Gateway L2 did not create the expected CfnGateway");
    }
    const authorizationPolicyResource = authorizationPolicy.node.defaultChild;
    if (!(authorizationPolicyResource instanceof IamCfnPolicy)) {
      throw new Error("Policy did not create the expected IAM CfnPolicy");
    }
    gatewayResource.addResourceDependency(authorizationPolicyResource);

    gatewayResource.policyEngineConfiguration = {
      arn: props.policyEngineArn,
      mode: props.policyMode,
    };

    // AWS標準のPolicy spanをX-Rayへ配送し、Cedarの判定を検証可能にする。
    const traceSourceName = `${props.gatewayName}-traces-source`;
    const traceSource = new CfnDeliverySource(this, "GatewayTraceSource", {
      name: traceSourceName,
      logType: "TRACES",
      resourceArn: this.gateway.gatewayArn,
    });
    traceSource.addResourceDependency(gatewayResource);

    const traceDestination = new CfnDeliveryDestination(
      this,
      "GatewayTraceDestination",
      {
        name: `${props.gatewayName}-traces-destination`,
        deliveryDestinationType: "XRAY",
      },
    );

    const traceDelivery = new CfnDelivery(this, "GatewayTraceDelivery", {
      deliverySourceName: traceSourceName,
      deliveryDestinationArn: traceDestination.attrArn,
    });
    traceDelivery.addResourceDependency(traceSource);
  }
}
