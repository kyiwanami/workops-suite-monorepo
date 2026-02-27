import { Amplify } from "aws-amplify";
import { generateClient } from "aws-amplify/data";
import { getAmplifyDataClientConfig } from "@aws-amplify/backend/function/runtime";
import { env } from "$amplify/env/asset-type-tool-list";
import type { Schema } from "../../../data/resource";

const { resourceConfig, libraryOptions } = await getAmplifyDataClientConfig(env);
Amplify.configure(resourceConfig, libraryOptions);

const client = generateClient<Schema>();

export const handler = async (event: { limit?: number; nextToken?: string }) => {
  console.log("List Asset Types Event:", JSON.stringify(event));

  const { data, errors } = await client.models.AssetType.list({
    limit: event.limit,
    nextToken: event.nextToken ?? undefined,
  });

  if (errors) {
    throw new Error(errors.map((e) => e.message).join(", "));
  }

  return { data };
};
