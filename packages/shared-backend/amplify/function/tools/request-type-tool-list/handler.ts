import { Amplify } from "aws-amplify";
import { generateClient } from "aws-amplify/data";
import { getAmplifyDataClientConfig } from "@aws-amplify/backend/function/runtime";
import { env } from "$amplify/env/request-type-tool-list";
import type { Schema } from "../../../data/resource";

const { resourceConfig, libraryOptions } = await getAmplifyDataClientConfig(env);
Amplify.configure(resourceConfig, libraryOptions);

const client = generateClient<Schema>();
const INTERNAL_LIMIT = 100;

export const handler = async () => {
  // 申請作成に利用する有効な種別のみ返却する。

  const { data, errors } = await client.models.RequestType.list({
    limit: INTERNAL_LIMIT,
  });

  if (errors) {
    throw new Error(errors.map((error) => error.message).join(", "));
  }

  return data;
};
