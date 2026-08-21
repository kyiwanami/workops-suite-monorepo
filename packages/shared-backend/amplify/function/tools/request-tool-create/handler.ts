import { Amplify } from "aws-amplify";
import { generateClient } from "aws-amplify/data";
import { getAmplifyDataClientConfig } from "@aws-amplify/backend/function/runtime";
import { env } from "$amplify/env/request-tool-create";
import type { Schema } from "../../../data/resource";

const { resourceConfig, libraryOptions } = await getAmplifyDataClientConfig(env);
Amplify.configure(resourceConfig, libraryOptions);

const client = generateClient<Schema>();

interface CreateRequestInput {
  departmentId?: string;
  requesterSub?: string;
  requestTypeId: string;
  title: string;
  amount?: number | null;
  description?: string;
}

export const handler = async (event: CreateRequestInput) => {
  // 現在のIAM fallbackではwrite toolを公開しない。
  // 本人委任を解除する場合は、Gateway境界で検証済みの値だけを受け取る。
  const departmentId = event.departmentId;
  const requesterSub = event.requesterSub;
  if (!departmentId || !requesterSub) {
    throw new Error("検証済み本人情報が不足しています。");
  }

  // modelが状態や監査時刻を指定できないよう、初期値は常にserver側で決める。
  const createInput: Schema["Request"]["createType"] = {
    departmentId,
    requesterSub,
    requestTypeId: event.requestTypeId,
    status: "draft",
    title: event.title,
    description: event.description,
  };
  if (event.amount !== undefined) {
    createInput.amount = event.amount;
  }

  const { data, errors } = await client.models.Request.create(createInput);

  if (errors) {
    throw new Error(errors.map((error) => error.message).join(", "));
  }

  return { data };
};
