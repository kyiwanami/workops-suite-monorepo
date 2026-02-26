import {
  CognitoIdentityProviderClient,
  DeleteGroupCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import type { Schema } from "../../../data/resource";
import { env } from "$amplify/env/deleteGroup";

const cognitoClient = new CognitoIdentityProviderClient({
  region: process.env.AWS_REGION,
});

type DeleteGroupHandler = Schema["deleteGroup"]["functionHandler"];

export const handler: DeleteGroupHandler = async (event) => {
  console.log("Function to delete group started", {
    groupName: event.arguments.groupName,
  });

  const { groupName } = event.arguments;

  const command = new DeleteGroupCommand({
    UserPoolId: env.USER_POOL_ID,
    GroupName: groupName,
  });

  await cognitoClient.send(command);

  console.log("Group deleted successfully:", groupName);
  return groupName;
};
