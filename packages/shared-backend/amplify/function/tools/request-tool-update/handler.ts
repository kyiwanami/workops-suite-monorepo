import { Amplify } from "aws-amplify";
import { generateClient } from "aws-amplify/data";
import { getAmplifyDataClientConfig } from "@aws-amplify/backend/function/runtime";
import { env } from "$amplify/env/request-tool-update";
import type { Schema } from "../../../data/resource";

const { resourceConfig, libraryOptions } = await getAmplifyDataClientConfig(env);
Amplify.configure(resourceConfig, libraryOptions);

const client = generateClient<Schema>();

type RequestStatus = Schema["Request"]["type"]["status"];
const REQUEST_STATUSES = client.enums.RequestStatusCode.values();

type UpdateActionType =
  | "update"
  | "submit"
  | "withdraw"
  | "approve"
  | "reject"
  | "return";

interface UpdatePatch {
  requestTypeId?: string;
  title?: string;
  description?: string;
  amount?: number;
}

interface UpdateRequestCommand {
  id: string;
  patch?: UpdatePatch;
  reason?: string;
  approverSub?: string;
}

interface GatewayContext {
  toolName?: string;
  custom?: {
    toolName?: string;
  };
  clientContext?: {
    custom?: {
      toolName?: string;
    };
  };
}

const TARGET_STATUS_BY_ACTION: Record<
  Exclude<UpdateActionType, "update">,
  RequestStatus
> = {
  submit: "submitted",
  withdraw: "withdrawn",
  approve: "approved",
  reject: "rejected",
  return: "draft",
};

const ALLOWED_FROM_STATUS: Record<
  Exclude<UpdateActionType, "update">,
  RequestStatus[]
> = {
  submit: ["draft"],
  withdraw: ["draft", "submitted"],
  approve: ["submitted"],
  reject: ["submitted"],
  return: ["submitted"],
};

function isRequestStatus(status: string): status is RequestStatus {
  return REQUEST_STATUSES.some((requestStatus) => requestStatus === status);
}

function resolveAction(context: GatewayContext): UpdateActionType {
  const toolName =
    context.toolName ??
    context.custom?.toolName ??
    context.clientContext?.custom?.toolName;

  if (toolName?.includes("submit-request")) {
    return "submit";
  }
  if (toolName?.includes("withdraw-request")) {
    return "withdraw";
  }
  if (toolName?.includes("approve-request")) {
    return "approve";
  }
  if (toolName?.includes("reject-request")) {
    return "reject";
  }
  if (toolName?.includes("return-request")) {
    return "return";
  }
  if (toolName?.includes("update-request")) {
    return "update";
  }
  throw new Error("対応していないツールです。");
}

export const handler = async (
  event: UpdateRequestCommand,
  context: GatewayContext,
) => {
  const action = resolveAction(context);

  // まず最新の申請を取得して、状態遷移の可否を判定する。
  const { data: currentRequest, errors: getErrors } = await client.models.Request.get({
    id: event.id,
  });

  if (getErrors) {
    throw new Error(getErrors.map((error) => error.message).join(", "));
  }
  if (!currentRequest) {
    throw new Error("更新対象の申請が存在しません。");
  }
  if (!isRequestStatus(currentRequest.status)) {
    throw new Error(`不正な現在ステータスです: ${currentRequest.status}`);
  }

  const now = new Date().toISOString();
  const updateInput: Schema["Request"]["updateType"] = {
    id: currentRequest.id,
  };

  if (action === "update") {
    if (!event.patch) {
      throw new Error("update-request では patch が必須です。");
    }
    if (event.patch.requestTypeId !== undefined) {
      updateInput.requestTypeId = event.patch.requestTypeId;
    }
    if (event.patch.title !== undefined) {
      updateInput.title = event.patch.title;
    }
    if (event.patch.description !== undefined) {
      updateInput.description = event.patch.description;
    }
    if (event.patch.amount !== undefined) {
      updateInput.amount = event.patch.amount;
    }
    if (
      event.patch.requestTypeId === undefined &&
      event.patch.title === undefined &&
      event.patch.description === undefined &&
      event.patch.amount === undefined
    ) {
      throw new Error("patch には1つ以上の更新項目が必要です。");
    }
  } else {
    const allowedFromStatus = ALLOWED_FROM_STATUS[action];
    if (!allowedFromStatus.includes(currentRequest.status)) {
      throw new Error(
        `${action} は ${currentRequest.status} 状態では実行できません。`,
      );
    }

    if ((action === "reject" || action === "return") && !event.reason) {
      throw new Error(`${action} では reason が必須です。`);
    }

    const targetStatus = TARGET_STATUS_BY_ACTION[action];
    updateInput.status = targetStatus;

    if (action === "submit") {
      updateInput.submittedAt = now;
    }
    if (action === "withdraw") {
      updateInput.withdrawnAt = now;
    }
    if (action === "approve") {
      if (!event.approverSub) {
        throw new Error("approve では approverSub が必須です。");
      }
      updateInput.approvedAt = now;
      updateInput.approverSub = event.approverSub;
    }
    if (action === "reject") {
      updateInput.rejectedAt = now;
      updateInput.rejectionReason = event.reason;
    }
    if (action === "return") {
      updateInput.returnedAt = now;
      updateInput.returnReason = event.reason;
    }
  }

  const { data, errors } = await client.models.Request.update(updateInput);
  if (errors) {
    throw new Error(errors.map((error) => error.message).join(", "));
  }

  return { data };
};
