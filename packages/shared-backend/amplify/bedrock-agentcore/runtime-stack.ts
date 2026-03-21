import { spawnSync } from "child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  rmSync,
  statSync,
  unlinkSync,
} from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { Construct } from "constructs";

// ESM環境では __dirname が未定義のため import.meta.url から導出する
const __dirname = dirname(fileURLToPath(import.meta.url));
import * as cdk from "aws-cdk-lib";
import {
  AgentRuntimeArtifact,
  AgentCoreRuntime,
  Runtime,
  RuntimeAuthorizerConfiguration,
  Gateway,
  Memory,
  BrowserCustom,
} from "@aws-cdk/aws-bedrock-agentcore-alpha";
import { PolicyStatement } from "aws-cdk-lib/aws-iam";

const OTEL_ENTRYPOINT_NAME = "opentelemetry-instrument";
const TARGET_PLATFORM = "aarch64-manylinux2014";
const TARGET_PYTHON_VERSION = "3.13";
const OTEL_WRAPPER_PATH = join(__dirname, "runtime/opentelemetry-instrument");

// AgentCore Runtime asset をローカルで組み立てる。
const bundleAgentRuntimeAsset = (sourceDir: string, outputDir: string): boolean => {
  const requirementsPath = join(sourceDir, "requirements.txt");
  mkdirSync(outputDir, { recursive: true });

  runCommand(
    "uv",
    [
      "pip",
      "install",
      "--python-platform",
      TARGET_PLATFORM,
      "--python-version",
      TARGET_PYTHON_VERSION,
      "--only-binary=:all:",
      "--target",
      outputDir,
      "-r",
      requirementsPath,
    ],
    sourceDir,
  );

  for (const runtimeFile of readdirSync(sourceDir)) {
    const sourcePath = join(sourceDir, runtimeFile);
    if (!statSync(sourcePath).isFile()) {
      continue;
    }

    if (!runtimeFile.endsWith(".py") && runtimeFile !== "requirements.txt") {
      continue;
    }

    cpSync(sourcePath, join(outputDir, runtimeFile));
  }

  writeOtelWrapper(outputDir);
  removeIncompatibleFiles(outputDir);
  return true;
};

const runCommand = (
  executable: string,
  commandArguments: string[],
  workingDirectory: string,
): void => {
  const commandResult = spawnSync(
    executable,
    commandArguments,
    {
      cwd: workingDirectory,
      encoding: "utf8",
      stdio: "pipe",
    },
  );

  if (commandResult.status !== 0) {
    throw new Error(
      `Failed to run ${executable}: ${commandResult.stdout ?? ""}\n${commandResult.stderr ?? ""}`,
    );
  }
};

const writeOtelWrapper = (outputDir: string): void => {
  cpSync(OTEL_WRAPPER_PATH, join(outputDir, OTEL_ENTRYPOINT_NAME));

  const binDirectory = join(outputDir, "bin");
  mkdirSync(binDirectory, { recursive: true });
  cpSync(OTEL_WRAPPER_PATH, join(binDirectory, OTEL_ENTRYPOINT_NAME));
};

const removeIncompatibleFiles = (targetDirectory: string): void => {
  for (const targetFile of readdirSync(targetDirectory)) {
    const targetPath = join(targetDirectory, targetFile);
    const targetStat = statSync(targetPath);

    if (targetStat.isDirectory()) {
      if (targetFile === "__pycache__") {
        rmSync(targetPath, { recursive: true, force: true });
        continue;
      }

      removeIncompatibleFiles(targetPath);
      continue;
    }

    if (
      targetFile.endsWith(".pyc")
      || targetFile.endsWith(".pyd")
      || targetFile.endsWith(".exe")
    ) {
      unlinkSync(targetPath);
    }
  }
};

interface AgentCoreStackProps {
  projectPathPrefix: string;
  region: string;
  userPoolId: string;
  userPoolClientId: string;
  gateway: Gateway; // InfrastructureからGatewayオブジェクトを受け取る
  memory: Memory; // InfrastructureからMemoryオブジェクトを受け取る
  browser: BrowserCustom; // InfrastructureからBrowserオブジェクトを受け取る
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

    const googleCustomSearchCx = process.env.GOOGLE_CUSTOM_SEARCH_CX;
    if (googleCustomSearchCx === undefined) {
      throw new Error("GOOGLE_CUSTOM_SEARCH_CX is required");
    }

    // ========== AgentCore Infrastructure Properties Validation ==========
    // CDK L2 Constructプロパティの型安全な検証
    const gatewayUrl = gateway.gatewayUrl;
    if (!gatewayUrl) {
      throw new Error("Gateway URL is required but was undefined");
    }

    const memoryIdValue = memory.memoryId;
    if (!memoryIdValue) {
      throw new Error("Memory ID is required but was undefined");
    }

    const browserIdValue = browser.browserId;
    if (!browserIdValue) {
      throw new Error("Browser ID is required but was undefined");
    }

    // ========== AgentCore Runtime ==========
    const runtimeSourcePath = join(__dirname, "runtime");
    const agentRuntime = new Runtime(this, "WorkopsSuiteAgentRuntime", {
      // Runtime名（必須）- 文字、数字、アンダースコアのみ
      // 既存リソースとの衝突を避けるためサフィックスを付与
      runtimeName: projectPathPrefix.replace(/-/g, "_"),

      // Pythonコードをローカルからzipして直接デプロイ（ECR/Docker/CodeBuild不要）
      agentRuntimeArtifact: AgentRuntimeArtifact.fromCodeAsset({
        path: runtimeSourcePath,
        assetHashType: cdk.AssetHashType.OUTPUT,
        bundling: {
          image: cdk.DockerImage.fromRegistry("public.ecr.aws/docker/library/python:3.13"),
          local: {
            tryBundle(outputDir: string): boolean {
              return bundleAgentRuntimeAsset(runtimeSourcePath, outputDir);
            },
          },
        },
        runtime: AgentCoreRuntime.PYTHON_3_13,
        entrypoint: ["opentelemetry-instrument", "main.py"],
      }),

      // 環境変数（Gateway URL、Memory ID、Browser ID）
      environmentVariables: {
        AGENTCORE_GATEWAY_URL: gatewayUrl,
        AGENTCORE_MEMORY_ID: memoryIdValue,
        BROWSER_IDENTIFIER: browserIdValue,
        GOOGLE_CUSTOM_SEARCH_CX: googleCustomSearchCx,
      },

      // Cognito JWT認証設定（Web Clientのみ許可）
      authorizerConfiguration: RuntimeAuthorizerConfiguration.usingJWT(
        `https://cognito-idp.${region}.amazonaws.com/${userPoolId}/.well-known/openid-configuration`,
        [userPoolClientId],
      ),

      // Authorization ヘッダーをエージェントコードに伝播
      requestHeaderConfiguration: {
        allowlistedHeaders: ["Authorization"],
      },
    });

    // Bedrock InvokeModel権限（グローバルモデル対応）
    agentRuntime.role.addToPrincipalPolicy(
      new PolicyStatement({
        actions: [
          "bedrock:InvokeModel",
          "bedrock:InvokeModelWithResponseStream",
        ],
        resources: ["*"], // グローバルモデル対応のため全リソース許可
      }),
    );

    // Memory読み取り・書き込み権限を付与
    agentRuntime.role.addToPrincipalPolicy(
      new PolicyStatement({
        actions: ["bedrock-agentcore:*"],
        resources: [
          `arn:aws:bedrock-agentcore:${region}:${cdk.Stack.of(this).account}:memory/${memoryIdValue}*`,
          `arn:aws:bedrock-agentcore:${region}:${cdk.Stack.of(this).account}:session/*`,
        ],
      }),
    );

    // Browser Tool使用権限を付与
    agentRuntime.role.addToPrincipalPolicy(
      new PolicyStatement({
        actions: ["bedrock-agentcore:*"],
        resources: [browser.browserArn],
      }),
    );

    // Browser WebSocket接続のための追加権限
    agentRuntime.role.addToPrincipalPolicy(
      new PolicyStatement({
        actions: [
          "bedrock-agentcore:ConnectBrowserAutomationStream", // WebSocket接続に必須
          "bedrock-agentcore:ConnectBrowserLiveViewStream",
          "bedrock-agentcore:StartBrowserSession",
          "bedrock-agentcore:StopBrowserSession",
          "bedrock-agentcore:GetBrowserSession",
          "bedrock-agentcore:UpdateBrowserStream",
        ],
        resources: [browser.browserArn, `${browser.browserArn}/*`],
      }),
    );

    this.runtimeArn = agentRuntime.agentRuntimeArn;
  }
}
