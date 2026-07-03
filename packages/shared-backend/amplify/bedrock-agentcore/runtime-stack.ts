import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { Construct } from "constructs";
import * as cdk from "aws-cdk-lib";
import {
  AgentCoreRuntime,
  AgentRuntimeArtifact,
  Gateway,
  Memory,
  ProtocolType,
  Runtime,
  RuntimeAuthorizerConfiguration,
  RuntimeNetworkConfiguration,
} from "aws-cdk-lib/aws-bedrockagentcore";
import {
  Effect,
  PolicyStatement,
  Role,
  ServicePrincipal,
} from "aws-cdk-lib/aws-iam";

const __dirname = dirname(fileURLToPath(import.meta.url));
const runtimeAssetPath = join(__dirname, "runtime", "asset");

interface AgentCoreStackProps {
  projectPathPrefix: string;
  region: string;
  userPoolId: string;
  userPoolClientId: string;
  gateway: Gateway;
  memory: Memory;
}

export class AgentCoreStack extends Construct {
  public readonly runtimeArn: string;

  constructor(scope: Construct, id: string, props: AgentCoreStackProps) {
    super(scope, id);

    const {
      projectPathPrefix,
      region,
      userPoolId,
      userPoolClientId,
      gateway,
      memory,
    } = props;

    const gatewayUrl = gateway.gatewayUrl;
    if (gatewayUrl === undefined || gatewayUrl.length === 0) {
      throw new Error("Gateway URL is required");
    }

    const memoryId = memory.memoryId;
    if (memoryId === undefined || memoryId.length === 0) {
      throw new Error("Memory ID is required");
    }

    const stack = cdk.Stack.of(this);
    const runtimeRole = new Role(this, "RuntimeExecutionRole", {
      assumedBy: new ServicePrincipal("bedrock-agentcore.amazonaws.com"),
      description: `AgentCore Runtime execution role for ${projectPathPrefix}`,
    });

    // RuntimeからBedrock、Memory、Gatewayへアクセスする最小の実行権限を付与する。
    runtimeRole.addToPolicy(
      new PolicyStatement({
        actions: [
          "bedrock:InvokeModel",
          "bedrock:InvokeModelWithResponseStream",
        ],
        resources: ["*"],
      }),
    );
    runtimeRole.addToPolicy(
      new PolicyStatement({
        actions: ["bedrock-agentcore:*"],
        resources: [
          `arn:${stack.partition}:bedrock-agentcore:${region}:${stack.account}:memory/${memoryId}*`,
          `arn:${stack.partition}:bedrock-agentcore:${region}:${stack.account}:session/*`,
          gateway.gatewayArn,
          `${gateway.gatewayArn}/*`,
        ],
      }),
    );
    runtimeRole.addToPolicy(
      new PolicyStatement({
        actions: [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents",
          "logs:DescribeLogStreams",
          "xray:PutTraceSegments",
          "xray:PutTelemetryRecords",
          "cloudwatch:PutMetricData",
        ],
        effect: Effect.ALLOW,
        resources: ["*"],
      }),
    );

    const agentRuntime = new Runtime(this, "WorkopsSuiteAgentRuntime", {
      runtimeName: projectPathPrefix.replace(/-/g, "_"),
      executionRole: runtimeRole,
      agentRuntimeArtifact: AgentRuntimeArtifact.fromCodeAsset({
        path: runtimeAssetPath,
        runtime: AgentCoreRuntime.NODE_22,
        entrypoint: ["server.js"],
      }),
      authorizerConfiguration: RuntimeAuthorizerConfiguration.usingJWT(
        `https://cognito-idp.${region}.amazonaws.com/${userPoolId}/.well-known/openid-configuration`,
        [userPoolClientId],
      ),
      environmentVariables: {
        AWS_REGION: region,
        AGENTCORE_GATEWAY_URL: gatewayUrl,
        AGENTCORE_MEMORY_ID: memoryId,
      },
      networkConfiguration: RuntimeNetworkConfiguration.usingPublicNetwork(),
      protocolConfiguration: ProtocolType.HTTP,
      requestHeaderConfiguration: {
        allowlistedHeaders: ["Authorization"],
      },
    });

    agentRuntime.node.addDependency(runtimeRole);
    this.runtimeArn = agentRuntime.agentRuntimeArn;
  }
}
