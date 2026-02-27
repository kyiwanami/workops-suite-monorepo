import { CfnResource } from 'aws-cdk-lib';
import { Construct } from 'constructs';

export class VectorStoreResources extends Construct {
  public readonly vectorStoreBucketArn: string;
  public readonly vectorIndexArn: string;

  constructor(scope: Construct, id: string) {
    super(scope, id);

    // 1. Vector Bucketの作成
    const vectorBucket = new CfnResource(this, 'VectorBucket', {
      type: 'AWS::S3Vectors::VectorBucket',
    });

    this.vectorStoreBucketArn = vectorBucket.getAtt('VectorBucketArn').toString();

    // 2. Vector Indexの作成
    const vectorIndex = new CfnResource(this, 'VectorIndex', {
      type: 'AWS::S3Vectors::Index',
      properties: {
        VectorBucketArn: this.vectorStoreBucketArn,
        IndexName: 'bedrock-knowledge-base-default-index', 
        Dimension: 1536, 
        DataType: 'float32',
        DistanceMetric: 'cosine'
      }
    });
    
    // KB作成時に必要なIndex ARNを公開
    // AWS::S3Vectors::Index の Ref は IndexArn を返す
    this.vectorIndexArn = vectorIndex.ref;
  }
}
