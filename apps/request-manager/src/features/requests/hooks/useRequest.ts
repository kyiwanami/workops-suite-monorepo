import { useEffect, useRef, useState } from "react";
import { generateClient } from "aws-amplify/data";
import type { Schema } from "@workops/data-schema";
import {
  isTransitionAllowed,
  type RequestStatusCode,
} from "../workflow";
import { useNotification } from "../../../shared/notification";
import { useAuth } from "../../../shared/auth/useAuth";

const client = generateClient<Schema>();

export type Request = Schema["Request"]["type"];
export type RequestCreateInput = Schema["Request"]["createType"];
export type RequestUpdateInput = Schema["Request"]["updateType"];
type AuditLogCreateInput = Schema["AuditLog"]["createType"];
type RequestAuditAction = Schema["RequestAuditAction"]["type"];

interface RequestTransitionFields {
  submittedAt?: string;
  approvedAt?: string;
  approverSub?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  withdrawnAt?: string;
  returnedAt?: string;
  returnReason?: string;
}

interface RequestCreateDraftInput {
  departmentId: string;
  requesterSub: string;
  requestTypeId: string;
  title: string;
  description?: string | null;
  amount: number;
}

export function useRequest(id?: string) {
  const [request, setRequest] = useState<Request | null>(null);
  const [loading, setLoading] = useState(!!id);
  const requestRef = useRef<Request | null>(null);
  const { showError } = useNotification();
  const { userInfo } = useAuth();

  useEffect(() => {
    requestRef.current = request;
  }, [request]);

  const createAuditLog = async ({
    requestId,
    action,
    performedBy,
    previousStatus,
    newStatus,
    reason,
  }: {
    requestId: string;
    action: RequestAuditAction;
    performedBy: string;
    previousStatus?: RequestStatusCode;
    newStatus?: RequestStatusCode;
    reason?: string;
  }) => {
    if (!performedBy) {
      console.error("AuditLog create error", "performedBy が取得できません");
      return;
    }

    const auditLogInput: AuditLogCreateInput = {
      requestId,
      action,
      performedBy,
      performedAt: new Date().toISOString(),
    };

    if (previousStatus !== undefined) {
      auditLogInput.previousStatus = previousStatus;
    }
    if (newStatus !== undefined) {
      auditLogInput.newStatus = newStatus;
    }
    if (reason !== undefined) {
      auditLogInput.reason = reason;
    }

    const { data, errors } = await client.models.AuditLog.create(auditLogInput);
    void data;

    if (errors) {
      console.error("AuditLog create error", errors);
    }
  };

  useEffect(() => {
    if (!id) {
      setRequest(null);
      requestRef.current = null;
      setLoading(false);
      return;
    }

    const fetchRequest = async () => {
      setLoading(true);
      const { data, errors } = await client.models.Request.get({ id });

      if (errors) {
        console.error("Request get error", errors);
        showError("申請の取得に失敗しました");
        setLoading(false);
        return;
      }

      setRequest(data);
      requestRef.current = data;
      setLoading(false);
    };

    void fetchRequest();

    const filter = { id: { eq: id } };

    const subUpdate = client.models.Request.onUpdate({ filter }).subscribe({
      next: (updated) => {
        setRequest(updated);
        requestRef.current = updated;
      },
      error: (error) => {
        console.error("Request onUpdate subscription error", error);
        showError("申請の監視に失敗しました");
      },
    });

    return () => {
      subUpdate.unsubscribe();
    };
  }, [id]);

  const createRequest = async (
    input: RequestCreateDraftInput,
  ): Promise<Request | null> => {
    const { data, errors } = await client.models.Request.create({
      ...input,
      status: "draft",
    });

    if (errors) {
      console.error("Request create error", errors);
      showError("申請の作成に失敗しました");
      return null;
    }

    setRequest(data);
    requestRef.current = data;
    if (data) {
      await createAuditLog({
        requestId: data.id,
        action: "create",
        performedBy: input.requesterSub,
        newStatus: "draft",
      });
    }
    return data;
  };

  const updateRequest = async (
    input: RequestUpdateInput,
  ): Promise<Request | null> => {
    const currentRequest = requestRef.current;
    const currentStatus = currentRequest?.status ?? input.status;
    const { data, errors } = await client.models.Request.update(input);

    if (errors) {
      console.error("Request update error", errors);
      showError("申請の更新に失敗しました");
      return null;
    }

    setRequest(data);
    requestRef.current = data;
    if (data && currentStatus) {
      await createAuditLog({
        requestId: data.id,
        action: "update",
        performedBy: userInfo.userId ?? "",
        previousStatus: currentStatus,
        newStatus: currentStatus,
      });
    }
    return data;
  };

  const applyTransition = async (
    targetStatus: RequestStatusCode,
    transitionFields: RequestTransitionFields,
  ): Promise<Request | null> => {
    const currentRequest = requestRef.current;

    if (!currentRequest) {
      console.error("Request transition error", "申請データが読み込まれていません");
      showError("申請データが読み込まれていません");
      return null;
    }

    if (!isTransitionAllowed(currentRequest.status, targetStatus)) {
      console.error(
        "Request transition error",
        "現在の状態ではこの操作は実行できません",
      );
      showError("現在の状態ではこの操作は実行できません");
      return null;
    }

    const { data, errors } = await client.models.Request.update({
      id: currentRequest.id,
      status: targetStatus,
      ...transitionFields,
    });

    if (errors) {
      console.error("Request transition error", errors);
      showError("操作に失敗しました");
      return null;
    }

    setRequest(data);
    requestRef.current = data;
    if (data) {
      const reason =
        targetStatus === "rejected"
          ? transitionFields.rejectionReason
          : targetStatus === "draft"
            ? transitionFields.returnReason
            : undefined;

      await createAuditLog({
        requestId: data.id,
        action:
          targetStatus === "submitted"
            ? "submit"
            : targetStatus === "withdrawn"
              ? "withdraw"
              : targetStatus === "approved"
                ? "approve"
                : targetStatus === "rejected"
                  ? "reject"
                  : "return",
        performedBy: userInfo.userId ?? "",
        previousStatus: currentRequest.status,
        newStatus: targetStatus,
        reason,
      });
    }
    return data;
  };

  const submitRequest = (): Promise<Request | null> =>
    applyTransition("submitted", { submittedAt: new Date().toISOString() });

  const withdrawRequest = (): Promise<Request | null> =>
    applyTransition("withdrawn", { withdrawnAt: new Date().toISOString() });

  const approveRequest = (approverSub: string): Promise<Request | null> =>
    applyTransition("approved", {
      approvedAt: new Date().toISOString(),
      approverSub,
    });

  const rejectRequest = (reason: string): Promise<Request | null> => {
    if (!reason) {
      console.error("Request reject validation error", "却下理由は必須です");
      showError("却下理由は必須です");
      return Promise.resolve(null);
    }
    return applyTransition("rejected", {
      rejectedAt: new Date().toISOString(),
      rejectionReason: reason,
    });
  };

  const returnRequest = (reason: string): Promise<Request | null> => {
    if (!reason) {
      console.error("Request return validation error", "差戻し理由は必須です");
      showError("差戻し理由は必須です");
      return Promise.resolve(null);
    }
    return applyTransition("draft", {
      returnedAt: new Date().toISOString(),
      returnReason: reason,
    });
  };

  const deleteRequest = async (currentUserSub: string): Promise<boolean> => {
    const currentRequest = requestRef.current;

    if (!currentRequest) {
      console.error("Request delete validation error", "申請データが読み込まれていません");
      showError("申請データが読み込まれていません");
      return false;
    }

    if (currentRequest.status !== "draft") {
      console.error("Request delete validation error", "下書きの申請のみ削除できます");
      showError("下書きの申請のみ削除できます");
      return false;
    }

    if (currentRequest.requesterSub !== currentUserSub) {
      console.error("Request delete validation error", "申請者本人のみ削除できます");
      showError("申請者本人のみ削除できます");
      return false;
    }

    const { data, errors } = await client.models.Request.delete({
      id: currentRequest.id,
    });

    if (errors) {
      console.error("Request delete error", errors);
      showError("申請の削除に失敗しました");
      return false;
    }

    void data;
    setRequest(null);
    requestRef.current = null;
    await createAuditLog({
      requestId: currentRequest.id,
      action: "delete",
      performedBy: currentUserSub,
      previousStatus: "draft",
    });
    return true;
  };

  return {
    request,
    loading,
    createRequest,
    updateRequest,
    submitRequest,
    withdrawRequest,
    approveRequest,
    rejectRequest,
    returnRequest,
    deleteRequest,
  };
}
