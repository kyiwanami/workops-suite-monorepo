import {
  CognitoIdentityProviderClient,
  AdminListGroupsForUserCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import type { Schema } from "../../../data/resource";
import { env } from "$amplify/env/listGroupsForUser";

const cognitoClient = new CognitoIdentityProviderClient({
  region: process.env.AWS_REGION,
});

type CognitoGroup = Schema["CognitoGroup"]["type"];
type ListGroupsForUserHandler = Schema["listGroupsForUser"]["functionHandler"];

export const handler: ListGroupsForUserHandler = async (event) => {
  console.log("Function to list groups for user started", {
    username: event.arguments.username,
  });

  const { username } = event.arguments;
  const allGroups: CognitoGroup[] = [];
  let nextToken: string | undefined;

  do {
    const command = new AdminListGroupsForUserCommand({
      UserPoolId: env.USER_POOL_ID,
      Username: username,
      Limit: 60,
      NextToken: nextToken,
    });

    const response = await cognitoClient.send(command);

    if (response.Groups) {
      const groupsBatch = response.Groups.map((group) => ({
        groupName: group.GroupName ?? "",
        description: group.Description,
        creationDate: group.CreationDate?.toISOString(),
        lastModifiedDate: group.LastModifiedDate?.toISOString(),
      }));
      allGroups.push(...groupsBatch);
    }

    nextToken = response.NextToken;
  } while (nextToken);

  console.log(`Found ${allGroups.length} groups for user "${username}"`);
  return allGroups;
};
