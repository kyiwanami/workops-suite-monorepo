import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as bedrock from "aws-cdk-lib/aws-bedrock";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as iam from "aws-cdk-lib/aws-iam";

interface BedrockResourcesProps extends cdk.StackProps {
  dataSourceBucketArn: string;
  vectorStoreBucketArn: string;
  vectorStoreIndexArn: string;
  region: string;
  account: string;
  branchName: string;
}

export class BedrockResources extends Construct {
  public readonly knowledgeBaseId: string;
  public readonly dataSourceId: string;

  constructor(scope: Construct, id: string, props: BedrockResourcesProps) {
    super(scope, id);

    // 1. バケットの参照
    const dataSourceBucket = s3.Bucket.fromBucketArn(
      this,
      "DataSourceBucket",
      props.dataSourceBucketArn,
    );

    // 2. Bedrock実行用IAMロールの作成
    const bedrockExecutionRole = new iam.Role(this, "BedrockExecutionRole", {
      assumedBy: new iam.ServicePrincipal("bedrock.amazonaws.com"),
      description: "Bedrock Knowledge Base execution role",
    });

    // S3アクセス権限の付与 (データソースの読み取り)
    dataSourceBucket.grantRead(bedrockExecutionRole);

    // S3 Vector Storeを利用するために必要な権限を追加
    const s3VectorsPolicy = new iam.PolicyStatement({
      sid: "S3VectorsPermissions",
      effect: iam.Effect.ALLOW,
      actions: [
        "s3vectors:GetIndex",
        "s3vectors:QueryVectors",
        "s3vectors:PutVectors",
        "s3vectors:GetVectors",
        "s3vectors:DeleteVectors",
      ],
      resources: [props.vectorStoreIndexArn],
      conditions: {
        StringEquals: {
          "aws:ResourceAccount": props.account,
        },
      },
    });
    bedrockExecutionRole.addToPolicy(s3VectorsPolicy);

    // モデル実行権限 (Titan Text Embeddings v1)
    bedrockExecutionRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ["bedrock:InvokeModel"],
        resources: [
          `arn:aws:bedrock:${props.region}::foundation-model/amazon.titan-embed-text-v1`,
        ],
      }),
    );

    // 3. Bedrock Knowledge Baseの作成 (S3 Vector Store構成)
    const knowledgeBase = new bedrock.CfnKnowledgeBase(
      this,
      "WorkopsKnowledgeBase",
      {
        name: `workops-kb-${props.branchName}`,
        description: "Knowledge base for Workops application using S3 Vector Store",
        roleArn: bedrockExecutionRole.roleArn,
        knowledgeBaseConfiguration: {
          type: "VECTOR",
          vectorKnowledgeBaseConfiguration: {
            embeddingModelArn: `arn:aws:bedrock:${props.region}::foundation-model/amazon.titan-embed-text-v1`,
          },
        },
        storageConfiguration: {
          type: "S3_VECTORS",
          s3VectorsConfiguration: {
            indexArn: props.vectorStoreIndexArn,
          },
        },
      },
    );

    // IAMロールとポリシーが完全に作成されるまでKB作成を待機
    knowledgeBase.node.addDependency(bedrockExecutionRole);

    // 4. データソースの作成
    const dataSource = new bedrock.CfnDataSource(this, "WorkopsDataSource", {
      name: `workops-ds-${props.branchName}`,
      knowledgeBaseId: knowledgeBase.ref,
      dataSourceConfiguration: {
        type: "S3",
        s3Configuration: {
          bucketArn: dataSourceBucket.bucketArn,
          inclusionPrefixes: ["kb-docs/"],
        },
      },
    });

    // IDを公開
    this.knowledgeBaseId = knowledgeBase.attrKnowledgeBaseId;
    this.dataSourceId = dataSource.attrDataSourceId;
  }
}
