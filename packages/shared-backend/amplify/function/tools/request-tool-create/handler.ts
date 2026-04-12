import { Amplify } from "aws-amplify";
import { generateClient } from "aws-amplify/data";
import { getAmplifyDataClientConfig } from "@aws-amplify/backend/function/runtime";
import { env } from "$amplify/env/request-tool-create";
import type { Schema } from "../../../data/resource";

const { resourceConfig, libraryOptions } = await getAmplifyDataClientConfig(env);
Amplify.configure(resourceConfig, libraryOptions);

const client = generateClient<Schema>();

type RequestStatus = Schema["Request"]["type"]["status"];

interface CreateRequestInput {
  departmentId: string;
  requesterSub: string;
  requestTypeId: string;
  status?: RequestStatus;
  title: string;
  amount?: number | null;
  description?: string;
  submittedAt?: string;
  approvedAt?: string;
  rejectedAt?: string;
  withdrawnAt?: string;
  returnedAt?: string;
}

export const handler = async (event: CreateRequestInput) => {
  // 初期状態は draft を既定値にして、submit は明示コマンドで実行する。
  const createInput: Schema["Request"]["createType"] = {
    departmentId: event.departmentId,
    requesterSub: event.requesterSub,
    requestTypeId: event.requestTypeId,
    status: event.status ?? "draft",
    title: event.title,
    description: event.description,
    submittedAt: event.submittedAt,
    approvedAt: event.approvedAt,
    rejectedAt: event.rejectedAt,
    withdrawnAt: event.withdrawnAt,
    returnedAt: event.returnedAt,
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
