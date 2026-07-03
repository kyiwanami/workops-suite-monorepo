import { Construct } from "constructs";
import { Stack, Duration } from "aws-cdk-lib";
import {
  CfnGateway,
  Gateway,
  GatewayAuthorizer,
  GatewayProtocol,
  McpGatewaySearchType,
  MCPProtocolVersion,
  Memory,
  MemoryStrategy,
} from "aws-cdk-lib/aws-bedrockagentcore";
import {
  Role,
  ServicePrincipal,
  CompositePrincipal,
  PolicyStatement,
  Effect,
} from "aws-cdk-lib/aws-iam";

/**
 * AgentCore Infrastructure Construct
 * Gateway, Memoryを一元管理するコンストラクト
 */
export class AgentCoreInfrastructure extends Construct {
  public readonly gateway: Gateway;
  public readonly gatewayName: string;
  public readonly memory: Memory;

  constructor(
    scope: Construct,
    id: string,
    props: {
      projectPathPrefix: string;
      userPoolId: string;
      userPoolClientId: string;
      policyEngineArn: string;
    }
  ) {
    super(scope, id);

    const { projectPathPrefix, userPoolId, userPoolClientId, policyEngineArn } =
      props;
    const region = Stack.of(this).region;
    const account = Stack.of(this).account;
    const partition = Stack.of(this).partition;

    this.gatewayName = `${projectPathPrefix}-gateway`;
    const memoryName = `${projectPathPrefix.replace(/-/g, "_")}_memory`;
    const gatewayArn = `arn:${partition}:bedrock-agentcore:${region}:${account}:gateway/${this.gatewayName}`;

    // 1. Gateway 実行用ロール
    const gatewayRole = new Role(this, "GatewayRole", {
      assumedBy: new CompositePrincipal(
        new ServicePrincipal("bedrock.amazonaws.com"),
        new ServicePrincipal("bedrock-agentcore.amazonaws.com")
      ),
      description: `AgentCore Gateway execution role for ${projectPathPrefix}`,
    });

    gatewayRole.assumeRolePolicy?.addStatements(
      new PolicyStatement({
        actions: ["sts:AssumeRole"],
        effect: Effect.ALLOW,
        principals: [new ServicePrincipal("bedrock-agentcore.amazonaws.com")],
        conditions: {
          StringEquals: {
            "aws:SourceAccount": account,
          },
          ArnLike: {
            "aws:SourceArn": `${gatewayArn}*`,
          },
        },
      })
    );

    // Gateway 作成時の policy engine 検証で参照される権限を先に作成する。
    const policyEngineGrant = gatewayRole.addToPrincipalPolicy(
      new PolicyStatement({
        actions: [
          "bedrock-agentcore:CheckAuthorizePermissions",
          "bedrock-agentcore:AuthorizeAction",
          "bedrock-agentcore:PartiallyAuthorizeActions",
          "bedrock-agentcore:GetPolicyEngine",
        ],
        resources: [`${gatewayArn}*`, policyEngineArn],
      }),
    );

    // 2. Memory（3つの戦略: Semantic, Preference, Summarization）
    this.memory = new Memory(this, "AgentMemory", {
      memoryName: memoryName,
      description: "Long-term memory for workops suite agent",
      expirationDuration: Duration.days(90),
      memoryStrategies: [
        MemoryStrategy.usingSemantic({
          strategyName: "Semantic",
          namespaces: ["/app/semantic/actors/{actorId}"],
        }),
        MemoryStrategy.usingUserPreference({
          strategyName: "Preference",
          namespaces: ["/app/preference/actors/{actorId}"],
        }),
        MemoryStrategy.usingSummarization({
          strategyName: "Summarization",
          namespaces: [
            "/app/summarization/actors/{actorId}/sessions/{sessionId}",
          ],
        }),
      ],
    });

    // 3. Gateway（MCP Server統合）
    this.gateway = new Gateway(this, "AgentGateway", {
      gatewayName: this.gatewayName,
      role: gatewayRole,
      description: `MCP Gateway for ${projectPathPrefix}`,
      authorizerConfiguration: GatewayAuthorizer.usingCustomJwt({
        discoveryUrl: `https://cognito-idp.${region}.amazonaws.com/${userPoolId}/.well-known/openid-configuration`,
        // Web Clientのみ許可
        allowedClients: [userPoolClientId],
      }),
      protocolConfiguration: GatewayProtocol.mcp({
        instructions: "Workops Suite Agent with MCP tools",
        searchType: McpGatewaySearchType.SEMANTIC,
        supportedVersions: [MCPProtocolVersion.MCP_2025_06_18],
      }),
    });

    // Gateway の Cedar policy 評価を CloudFormation 管理の設定として有効化する。
    const res = this.gateway.node.defaultChild;
    if (res instanceof CfnGateway) {
      res.policyEngineConfiguration = {
        arn: policyEngineArn,
        mode: "ENFORCE",
      };
      if (policyEngineGrant.policyDependable) {
        res.node.addDependency(policyEngineGrant.policyDependable);
      }
    } else {
      throw new Error("AgentCore Gateway L1 resource is required");
    }

    // 依存関係の明示化
    this.gateway.node.addDependency(this.memory);

    // Gateway基本権限
    gatewayRole.addToPolicy(
      new PolicyStatement({
        actions: [
          "bedrock-agentcore:GetResourceApiKey",
          "bedrock-agentcore:GetWorkloadAccessToken",
        ],
        resources: ["*"],
      })
    );

    // Lambda関数呼び出し権限（MCP Lambda tools用）
    gatewayRole.addToPolicy(
      new PolicyStatement({
        actions: ["lambda:InvokeFunction"],
        resources: ["*"],
      })
    );
  }
}
