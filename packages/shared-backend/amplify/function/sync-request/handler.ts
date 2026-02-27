import type { DynamoDBStreamHandler } from "aws-lambda";
import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import {
  BedrockAgentClient,
  ListIngestionJobsCommand,
  StartIngestionJobCommand,
} from "@aws-sdk/client-bedrock-agent";
import { env } from "$amplify/env/sync-request";

const s3Client = new S3Client();
const bedrockClient = new BedrockAgentClient();

export const handler: DynamoDBStreamHandler = async (event) => {
  const bucketName = env.DATA_SOURCE_BUCKET_NAME;
  const knowledgeBaseId = env.KNOWLEDGE_BASE_ID;
  const dataSourceId = env.DATA_SOURCE_ID;

  console.log(`Processing ${event.Records.length} request records`);

  for (const record of event.Records) {
    const requestId = record.dynamodb?.Keys?.id?.S;
    if (!requestId) {
      console.warn("Record missing ID, skipping");
      continue;
    }

    if (record.eventName === "INSERT" || record.eventName === "MODIFY") {
      const request = record.dynamodb?.NewImage;

      const departmentId = request?.departmentId?.S || "未設定";
      const requesterSub = request?.requesterSub?.S || "未設定";
      const requestTypeId = request?.requestTypeId?.S || "未設定";
      const status = request?.status?.S || "未設定";
      const title = request?.title?.S || "未設定";
      const description = request?.description?.S || "";
      const amount = request?.amount?.N || "0";
      const submittedAt = request?.submittedAt?.S || "";
      const approvedAt = request?.approvedAt?.S || "";
      const rejectedAt = request?.rejectedAt?.S || "";
      const withdrawnAt = request?.withdrawnAt?.S || "";
      const returnedAt = request?.returnedAt?.S || "";
      const createdAt = request?.createdAt?.S || "";
      const updatedAt = request?.updatedAt?.S || "";

      const document = [
        `申請ID: ${requestId}`,
        `部門ID: ${departmentId}`,
        `申請者: ${requesterSub}`,
        `申請種別ID: ${requestTypeId}`,
        `ステータス: ${status}`,
        `タイトル: ${title}`,
        `説明: ${description}`,
        `金額: ${amount}`,
        `提出日: ${submittedAt}`,
        `承認日: ${approvedAt}`,
        `却下日: ${rejectedAt}`,
        `取下日: ${withdrawnAt}`,
        `差戻日: ${returnedAt}`,
        `登録日: ${createdAt}`,
        `更新日: ${updatedAt}`,
      ].join("\n");

      const metadata = {
        metadataAttributes: {
          documentType: "request",
          requestId,
          departmentId,
          requesterSub,
          requestTypeId,
          status,
          title,
          amount,
          updatedAt,
        },
      };

      console.log(`Uploading request-${requestId} to S3`);

      await s3Client.send(
        new PutObjectCommand({
          Bucket: bucketName,
          Key: `kb-docs/request-${requestId}.txt`,
          Body: document,
          ContentType: "text/plain",
        }),
      );

      await s3Client.send(
        new PutObjectCommand({
          Bucket: bucketName,
          Key: `kb-docs/request-${requestId}.txt.metadata.json`,
          Body: JSON.stringify(metadata),
          ContentType: "application/json",
        }),
      );
    } else if (record.eventName === "REMOVE") {
      console.log(`Deleting request-${requestId} from S3`);

      await s3Client.send(
        new DeleteObjectCommand({
          Bucket: bucketName,
          Key: `kb-docs/request-${requestId}.txt`,
        }),
      );

      await s3Client.send(
        new DeleteObjectCommand({
          Bucket: bucketName,
          Key: `kb-docs/request-${requestId}.txt.metadata.json`,
        }),
      );
    }
  }

  console.log("Starting Bedrock Knowledge Base ingestion for Request updates");

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
