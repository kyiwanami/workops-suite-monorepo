import type {
  AttributeValue,
  DynamoDBStreamEvent,
  DynamoDBStreamHandler,
} from "aws-lambda";
import {
  CognitoIdentityProviderClient,
  CreateGroupCommand,
  DeleteGroupCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import { env } from "$amplify/env/department-stream-handler";

const cognitoClient = new CognitoIdentityProviderClient({
  region: env.AWS_REGION,
});

const getStringAttribute = (
  image: Record<string, AttributeValue> | undefined,
  key: string,
) => {
  const value = image?.[key]?.S;
  return value ?? null;
};

const buildGroupNames = (code: string) => [
  `${code}_viewer`,
  `${code}_editor`,
  `${code}_manager`,
];

const createGroupsForDepartment = async (code: string) => {
  const groupNames = buildGroupNames(code);

  for (const groupName of groupNames) {
    // Department作成時に権限グループを自動生成
    const command = new CreateGroupCommand({
      UserPoolId: env.USER_POOL_ID,
      GroupName: groupName,
    });

    try {
      await cognitoClient.send(command);
    } catch (error) {
      if (error instanceof Error && error.name === "GroupExistsException") {
        continue;
      }

      throw error;
    }
  }
};

const deleteGroupsForDepartment = async (code: string) => {
  const groupNames = buildGroupNames(code);

  for (const groupName of groupNames) {
    // Department削除時に権限グループを自動削除
    const command = new DeleteGroupCommand({
      UserPoolId: env.USER_POOL_ID,
      GroupName: groupName,
    });

    try {
      await cognitoClient.send(command);
    } catch (error) {
      if (error instanceof Error && error.name === "ResourceNotFoundException") {
        continue;
      }

      throw error;
    }
  }
};

const handleRecord = async (
  record: DynamoDBStreamEvent["Records"][number],
) => {
  const { eventName, dynamodb } = record;

  if (!eventName || !dynamodb) {
    return;
  }

  if (eventName === "INSERT") {
    const code = getStringAttribute(dynamodb.NewImage, "code");
    if (code) {
      await createGroupsForDepartment(code);
    }
    return;
  }

  if (eventName === "REMOVE") {
    const code =
      getStringAttribute(dynamodb.Keys, "code") ??
      getStringAttribute(dynamodb.OldImage, "code");

    if (code) {
      await deleteGroupsForDepartment(code);
    }
  }
};

export const handler: DynamoDBStreamHandler = async (event) => {
  // DepartmentマスタのINSERT/REMOVEにのみ反応
  for (const record of event.Records) {
    await handleRecord(record);
  }
};
