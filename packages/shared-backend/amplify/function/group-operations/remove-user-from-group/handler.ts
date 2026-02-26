import {
  CognitoIdentityProviderClient,
  AdminRemoveUserFromGroupCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import type { Schema } from "../../../data/resource";
import { env } from "$amplify/env/removeUserFromGroup";

const cognitoClient = new CognitoIdentityProviderClient({
  region: process.env.AWS_REGION,
});

type RemoveUserFromGroupHandler = Schema["removeUserFromGroup"]["functionHandler"];

export const handler: RemoveUserFromGroupHandler = async (event) => {
  console.log("Function to remove user from group started", {
    username: event.arguments.username,
    groupName: event.arguments.groupName,
  });

  const { username, groupName } = event.arguments;

  const command = new AdminRemoveUserFromGroupCommand({
    UserPoolId: env.USER_POOL_ID,
    Username: username,
    GroupName: groupName,
  });

  await cognitoClient.send(command);

  console.log(`User "${username}" removed from group "${groupName}"`);
  return username;
};
