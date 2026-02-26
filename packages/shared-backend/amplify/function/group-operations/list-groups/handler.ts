import {
  CognitoIdentityProviderClient,
  ListGroupsCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import type { Schema } from "../../../data/resource";
import { env } from "$amplify/env/listGroups";

const cognitoClient = new CognitoIdentityProviderClient({
  region: process.env.AWS_REGION,
});

type CognitoGroup = Schema["CognitoGroup"]["type"];
type ListGroupsHandler = Schema["listGroups"]["functionHandler"];

export const handler: ListGroupsHandler = async (event) => {
  console.log("Function to list groups started", JSON.stringify(event));

  const allGroups: CognitoGroup[] = [];
  let nextToken: string | undefined;

  do {
    const command = new ListGroupsCommand({
      UserPoolId: env.USER_POOL_ID,
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

  console.log(`Found ${allGroups.length} groups total`);
  return allGroups;
};
