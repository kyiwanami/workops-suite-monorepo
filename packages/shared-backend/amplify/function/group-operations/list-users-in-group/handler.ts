import {
  CognitoIdentityProviderClient,
  ListUsersInGroupCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import type { Schema } from "../../../data/resource";
import { env } from "$amplify/env/listUsersInGroup";

const cognitoClient = new CognitoIdentityProviderClient({
  region: process.env.AWS_REGION,
});

type CognitoUser = Schema["CognitoUser"]["type"];
type ListUsersInGroupHandler = Schema["listUsersInGroup"]["functionHandler"];

export const handler: ListUsersInGroupHandler = async (event) => {
  console.log("Function to list users in group started", {
    groupName: event.arguments.groupName,
  });

  const { groupName } = event.arguments;
  const allUsers: CognitoUser[] = [];
  let nextToken: string | undefined;

  do {
    const command = new ListUsersInGroupCommand({
      UserPoolId: env.USER_POOL_ID,
      GroupName: groupName,
      Limit: 60,
      NextToken: nextToken,
    });

    const response = await cognitoClient.send(command);

    if (response.Users) {
      const usersBatch = response.Users.map((user) => ({
        username: user.Username ?? "",
        email: user.Attributes?.find((attr) => attr.Name === "email")?.Value,
        status: user.UserStatus,
        enabled: user.Enabled,
        createdDate: user.UserCreateDate?.toISOString(),
        lastModifiedDate: user.UserLastModifiedDate?.toISOString(),
      }));
      allUsers.push(...usersBatch);
    }

    nextToken = response.NextToken;
  } while (nextToken);

  console.log(`Found ${allUsers.length} users in group "${groupName}"`);
  return allUsers;
};
