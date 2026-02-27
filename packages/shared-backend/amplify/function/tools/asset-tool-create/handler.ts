import { Amplify } from "aws-amplify";
import { generateClient } from "aws-amplify/data";
import { getAmplifyDataClientConfig } from "@aws-amplify/backend/function/runtime";
import { env } from "$amplify/env/asset-tool-create";
import type { Schema } from "../../../data/resource";

const { resourceConfig, libraryOptions } = await getAmplifyDataClientConfig(env);
Amplify.configure(resourceConfig, libraryOptions);

const client = generateClient<Schema>();

export const handler = async (event: Schema["Asset"]["createType"]) => {
  console.log("Create Asset Event:", JSON.stringify(event));

  const { data, errors } = await client.models.Asset.create(event);

  if (errors) {
    throw new Error(errors.map((e) => e.message).join(", "));
  }

  return { data };
};
