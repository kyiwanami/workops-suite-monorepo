import type { DynamoDBStreamHandler } from "aws-lambda";
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import {
  BedrockAgentClient,
  StartIngestionJobCommand,
  ListIngestionJobsCommand,
} from "@aws-sdk/client-bedrock-agent";
import { env } from "$amplify/env/sync-asset";

const s3Client = new S3Client();
const bedrockClient = new BedrockAgentClient();

export const handler: DynamoDBStreamHandler = async (event) => {
  const bucketName = env.DATA_SOURCE_BUCKET_NAME;
  const knowledgeBaseId = env.KNOWLEDGE_BASE_ID;
  const dataSourceId = env.DATA_SOURCE_ID;

  console.log(`Processing ${event.Records.length} asset records`);

  for (const record of event.Records) {
    const assetId = record.dynamodb?.Keys?.id?.S;
    if (!assetId) {
      console.warn("Record missing ID, skipping");
      continue;
    }

    if (record.eventName === "INSERT" || record.eventName === "MODIFY") {
      const asset = record.dynamodb?.NewImage;

      const departmentId = asset?.departmentId?.S || "未設定";
      const name = asset?.name?.S || "未設定";
      const assetTypeId = asset?.assetTypeId?.S || "未設定";
      const status = asset?.status?.S || "未設定";
      const assigneeSub = asset?.assigneeSub?.S || "未割当";
      const createdAt = asset?.createdAt?.S || "";
      const updatedAt = asset?.updatedAt?.S || "";

      const document = [
        `資産ID: ${assetId}`,
        `名称: ${name}`,
        `部門ID: ${departmentId}`,
        `資産タイプID: ${assetTypeId}`,
        `ステータス: ${status}`,
        `担当者: ${assigneeSub}`,
        `登録日: ${createdAt}`,
        `更新日: ${updatedAt}`,
      ].join("\n");

      const metadata = {
        metadataAttributes: {
          documentType: "asset",
          assetId,
          name,
          departmentId,
          assetTypeId,
          status,
          assigneeSub,
          updatedAt,
        },
      };

      console.log(`Uploading asset-${assetId} to S3`);

      await s3Client.send(
        new PutObjectCommand({
          Bucket: bucketName,
          Key: `kb-docs/asset-${assetId}.txt`,
          Body: document,
          ContentType: "text/plain",
        }),
      );

      await s3Client.send(
        new PutObjectCommand({
          Bucket: bucketName,
          Key: `kb-docs/asset-${assetId}.txt.metadata.json`,
          Body: JSON.stringify(metadata),
          ContentType: "application/json",
        }),
      );
    } else if (record.eventName === "REMOVE") {
      console.log(`Deleting asset-${assetId} from S3`);

      await s3Client.send(
        new DeleteObjectCommand({
          Bucket: bucketName,
          Key: `kb-docs/asset-${assetId}.txt`,
        }),
      );

      await s3Client.send(
        new DeleteObjectCommand({
          Bucket: bucketName,
          Key: `kb-docs/asset-${assetId}.txt.metadata.json`,
        }),
      );
    }
  }

  console.log("Starting Bedrock Knowledge Base ingestion for Asset updates");

  try {
    const { ingestionJobSummaries } = await bedrockClient.send(
      new ListIngestionJobsCommand({
        knowledgeBaseId,
        dataSourceId,
        filters: [
          {
            attribute: "STATUS",
            operator: "EQ",
            values: ["STARTING"],
          },
        ],
        maxResults: 1,
      }),
    );

    if (ingestionJobSummaries && ingestionJobSummaries.length > 0) {
      console.log("Ingestion job is starting, skipping new job creation.");
      return;
    }

    await bedrockClient.send(
      new StartIngestionJobCommand({
        knowledgeBaseId,
        dataSourceId,
      }),
    );
    console.log("Ingestion job started successfully");
  } catch (error) {
    console.error("Failed to start ingestion job:", error);
  }
};
