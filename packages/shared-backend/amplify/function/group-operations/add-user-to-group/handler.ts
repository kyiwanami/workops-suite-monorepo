import {
  CognitoIdentityProviderClient,
  AdminAddUserToGroupCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import type { Schema } from "../../../data/resource";
import { env } from "$amplify/env/addUserToGroup";

const cognitoClient = new CognitoIdentityProviderClient({
  region: process.env.AWS_REGION,
});

type AddUserToGroupHandler = Schema["addUserToGroup"]["functionHandler"];

export const handler: AddUserToGroupHandler = async (event) => {
  console.log("Function to add user to group started", {
    username: event.arguments.username,
    groupName: event.arguments.groupName,
  });

  const { username, groupName } = event.arguments;

  const command = new AdminAddUserToGroupCommand({
    UserPoolId: env.USER_POOL_ID,
    Username: username,
    GroupName: groupName,
  });

  await cognitoClient.send(command);

  console.log(`User "${username}" added to group "${groupName}"`);
  return username;
};
