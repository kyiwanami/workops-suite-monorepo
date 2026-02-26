import {
  CognitoIdentityProviderClient,
  CreateGroupCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import type { Schema } from "../../../data/resource";
import { env } from "$amplify/env/createGroup";

const cognitoClient = new CognitoIdentityProviderClient({
  region: process.env.AWS_REGION,
});

type CreateGroupHandler = Schema["createGroup"]["functionHandler"];

export const handler: CreateGroupHandler = async (event) => {
  console.log("Function to create group started", {
    groupName: event.arguments.groupName,
  });

  const { groupName, description } = event.arguments;

  const command = new CreateGroupCommand({
    UserPoolId: env.USER_POOL_ID,
    GroupName: groupName,
    Description: description ?? undefined,
  });

  const response = await cognitoClient.send(command);

  console.log("Group created successfully:", response.Group?.GroupName);

  return {
    groupName: response.Group?.GroupName ?? groupName,
    description: response.Group?.Description,
    creationDate: response.Group?.CreationDate?.toISOString(),
    lastModifiedDate: response.Group?.LastModifiedDate?.toISOString(),
  };
};
