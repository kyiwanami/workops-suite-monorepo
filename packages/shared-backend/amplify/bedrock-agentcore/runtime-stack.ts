import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { Construct } from "constructs";
import { Asset } from "aws-cdk-lib/aws-s3-assets";
import * as cdk from "aws-cdk-lib";
import {
  BrowserCustom,
  CfnRuntime,
  Gateway,
  Memory,
} from "aws-cdk-lib/aws-bedrockagentcore";
import {
  Effect,
  PolicyStatement,
  Role,
  ServicePrincipal,
} from "aws-cdk-lib/aws-iam";

const __dirname = dirname(fileURLToPath(import.meta.url));

interface AgentCoreStackProps {
  projectPathPrefix: string;
  region: string;
  userPoolId: string;
  userPoolClientId: string;
  gateway: Gateway;
  memory: Memory;
  browser: BrowserCustom;
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
      browser,
    } = props;

    const gatewayUrl = gateway.gatewayUrl;
    if (gatewayUrl === undefined || gatewayUrl.length === 0) {
      throw new Error("Gateway URL is required");
    }

    const memoryId = memory.memoryId;
    if (memoryId === undefined || memoryId.length === 0) {
      throw new Error("Memory ID is required");
    }

    const browserId = browser.browserId;
    if (browserId === undefined || browserId.length === 0) {
      throw new Error("Browser ID is required");
    }

    const stack = cdk.Stack.of(this);
    const runtimeAsset = new Asset(this, "RuntimeCodeAsset", {
      path: join(__dirname, "runtime", "asset"),
    });
    const runtimeRole = new Role(this, "RuntimeExecutionRole", {
      assumedBy: new ServicePrincipal("bedrock-agentcore.amazonaws.com"),
      description: `AgentCore Runtime execution role for ${projectPathPrefix}`,
    });

    runtimeAsset.grantRead(runtimeRole);

    // RuntimeからBedrock、Memory、Browserへアクセスする最小の実行権限を付与する。
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
          browser.browserArn,
          `${browser.browserArn}/*`,
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

    const agentRuntime = new CfnRuntime(this, "WorkopsSuiteAgentRuntime", {
      agentRuntimeName: projectPathPrefix.replace(/-/g, "_"),
      roleArn: runtimeRole.roleArn,
      agentRuntimeArtifact: {
        codeConfiguration: {
          code: {
            s3: {
              bucket: runtimeAsset.s3BucketName,
              prefix: runtimeAsset.s3ObjectKey,
            },
          },
          entryPoint: ["node", "server.js"],
          runtime: "NODE_22",
        },
      },
      authorizerConfiguration: {
        customJwtAuthorizer: {
          discoveryUrl: `https://cognito-idp.${region}.amazonaws.com/${userPoolId}/.well-known/openid-configuration`,
          allowedClients: [userPoolClientId],
        },
      },
      environmentVariables: {
        AWS_REGION: region,
        AGENTCORE_GATEWAY_URL: gatewayUrl,
        AGENTCORE_MEMORY_ID: memoryId,
        BROWSER_IDENTIFIER: browserId,
      },
      networkConfiguration: {
        networkMode: "PUBLIC",
      },
      protocolConfiguration: "HTTP",
      requestHeaderConfiguration: {
        requestHeaderAllowlist: ["Authorization"],
      },
    });

    agentRuntime.node.addDependency(runtimeRole);
    this.runtimeArn = agentRuntime.attrAgentRuntimeArn;
  }
}
