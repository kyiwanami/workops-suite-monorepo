import { Amplify } from "aws-amplify";
import { generateClient } from "aws-amplify/data";
import { getAmplifyDataClientConfig } from "@aws-amplify/backend/function/runtime";
import { env } from "$amplify/env/request-tool-get";
import type { Schema } from "../../../data/resource";

const { resourceConfig, libraryOptions } = await getAmplifyDataClientConfig(env);
Amplify.configure(resourceConfig, libraryOptions);

const client = generateClient<Schema>();

interface GetRequestInput {
  id: string;
}

export const handler = async (event: GetRequestInput) => {
  // 申請ID指定で詳細を1件取得する。
  const { data, errors } = await client.models.Request.get({ id: event.id });

  if (errors) {
    throw new Error(errors.map((error) => error.message).join(", "));
  }

  return data;
};
