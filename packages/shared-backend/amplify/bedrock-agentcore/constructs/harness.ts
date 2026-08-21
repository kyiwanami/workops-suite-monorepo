import { Stack } from "aws-cdk-lib";
import { CfnHarness } from "aws-cdk-lib/aws-bedrockagentcore";
import {
  Effect,
  PolicyStatement,
  Role,
  ServicePrincipal,
} from "aws-cdk-lib/aws-iam";
import { Construct } from "constructs";
import { gatewayServerName } from "../tool-access";

interface HarnessProps {
  harnessName: string;
  gatewayArn: string;
  discoveryUrl: string;
  allowedClientIds: string[];
  allowedScope: string;
}

const modelId = "jp.anthropic.claude-sonnet-4-6";
const foundationModelId = "anthropic.claude-sonnet-4-6";

/** Cognito JWT inboundとIAM Gateway outboundを持つManaged Harnessを定義する。 */
export class AgentHarness extends Construct {
  public readonly harness: CfnHarness;
  public readonly harnessArn: string;
  public readonly memoryArn: string;
  public readonly gatewayPrincipalId: string;

  constructor(scope: Construct, id: string, props: HarnessProps) {
    super(scope, id);

    const stack = Stack.of(this);
    // Managed Harnessは内部のAgentCore Runtimeからこのロールを引き受ける。
    // AWS公式のRuntime trust policyどおり、AgentCoreの全resource typeを許可する。
    const agentCoreSourceArn = stack.formatArn({
      service: "bedrock-agentcore",
      resource: "*",
    });
    const memoryArnPattern = stack.formatArn({
      service: "bedrock-agentcore",
      resource: "memory",
      // managed Memory IDはHarness作成時にAWSが生成するため、事前に確定できる
      // Harness名から始まるservice-owned IDへ限定する。
      resourceName: `${props.harnessName}-*`,
    });
    const runtimeLogGroupArn = `arn:${stack.partition}:logs:${stack.region}:${stack.account}:log-group:/aws/bedrock-agentcore/runtimes/*`;
    const executionRole = new Role(this, "ExecutionRole", {
      assumedBy: new ServicePrincipal("bedrock-agentcore.amazonaws.com", {
        conditions: {
          StringEquals: {
            "aws:SourceAccount": stack.account,
          },
          ArnLike: {
            "aws:SourceArn": agentCoreSourceArn,
          },
        },
      }),
      description: "Execution role for the WorkOps Managed Harness",
    });

    executionRole.addToPolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ["bedrock:InvokeModel", "bedrock:InvokeModelWithResponseStream"],
        resources: [
          stack.formatArn({
            service: "bedrock",
            resource: "inference-profile",
            resourceName: modelId,
          }),
          `arn:${stack.partition}:bedrock:*::foundation-model/${foundationModelId}`,
        ],
      }),
    );
    executionRole.addToPolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ["bedrock-agentcore:InvokeGateway"],
        resources: [props.gatewayArn],
      }),
    );
    executionRole.addToPolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: [
          "bedrock-agentcore:CreateEvent",
          "bedrock-agentcore:GetEvent",
          "bedrock-agentcore:ListEvents",
          "bedrock-agentcore:DeleteEvent",
          "bedrock-agentcore:RetrieveMemoryRecords",
        ],
        resources: [memoryArnPattern],
      }),
    );
    executionRole.addToPolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: [
          "ecr-public:GetAuthorizationToken",
          "sts:GetServiceBearerToken",
        ],
        resources: ["*"],
      }),
    );
    executionRole.addToPolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: [
          "xray:PutTraceSegments",
          "xray:PutTelemetryRecords",
          "xray:GetSamplingRules",
          "xray:GetSamplingTargets",
        ],
        resources: ["*"],
      }),
    );
    executionRole.addToPolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ["logs:CreateLogGroup", "logs:DescribeLogStreams"],
        resources: [runtimeLogGroupArn],
      }),
    );
    executionRole.addToPolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ["logs:DescribeLogGroups"],
        resources: [
          `arn:${stack.partition}:logs:${stack.region}:${stack.account}:log-group:*`,
        ],
      }),
    );
    executionRole.addToPolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ["logs:CreateLogStream", "logs:PutLogEvents"],
        resources: [`${runtimeLogGroupArn}:log-stream:*`],
      }),
    );
    executionRole.addToPolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ["logs:PutResourcePolicy"],
        resources: ["*"],
      }),
    );
    executionRole.addToPolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ["cloudwatch:PutMetricData"],
        resources: ["*"],
        conditions: {
          StringEquals: {
            "cloudwatch:namespace": "bedrock-agentcore",
          },
        },
      }),
    );

    this.harness = new CfnHarness(this, "Harness", {
      executionRoleArn: executionRole.roleArn,
      harnessName: props.harnessName,
      model: {
        bedrockModelConfig: {
          modelId,
          apiFormat: "converse_stream",
        },
      },
      authorizerConfiguration: {
        customJwtAuthorizer: {
          discoveryUrl: props.discoveryUrl,
          allowedClients: props.allowedClientIds,
          allowedScopes: [props.allowedScope],
        },
      },
      tools: [
        {
          type: "agentcore_gateway",
          name: gatewayServerName,
          config: {
            agentCoreGateway: {
              gatewayArn: props.gatewayArn,
              outboundAuth: {
                awsIam: {},
              },
            },
          },
        },
      ],
      allowedTools: ["*"],
      memory: {
        managedMemoryConfiguration: {},
      },
      systemPrompt: [
        {
          text: "あなたはWorkOpsの業務アシスタントです。提供された業務toolを使って資産管理と申請管理を支援してください。",
        },
      ],
    });

    this.harnessArn = this.harness.attrArn;
    this.memoryArn = this.harness.attrMemoryManagedMemoryConfigurationArn;
    // AgentCore Policyはassumed-role principalからsession名を除いたIDを使う。
    this.gatewayPrincipalId = `arn:${stack.partition}:sts::${stack.account}:assumed-role/${executionRole.roleName}`;
  }
}
