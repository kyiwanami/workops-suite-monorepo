import { useEffect, useState } from "react";
import { generateClient } from "aws-amplify/data";
import type { Schema } from "@workops/data-schema";
import {
  isTransitionAllowed,
  type RequestStatusCode,
} from "../workflow";
import { useNotification } from "../../../shared/notification";

const client = generateClient<Schema>();

export type Request = Schema["Request"]["type"];
export type RequestCreateInput = Schema["Request"]["createType"];
export type RequestUpdateInput = Schema["Request"]["updateType"];

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
  const { showError } = useNotification();

  useEffect(() => {
    if (!id) {
      setRequest(null);
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
      setLoading(false);
    };

    void fetchRequest();

    const filter = { id: { eq: id } };

    const subUpdate = client.models.Request.onUpdate({ filter }).subscribe({
      next: (updated) => {
        setRequest(updated);
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
    return data;
  };

  const updateRequest = async (
    input: RequestUpdateInput,
  ): Promise<Request | null> => {
    const { data, errors } = await client.models.Request.update(input);

    if (errors) {
      console.error("Request update error", errors);
      showError("申請の更新に失敗しました");
      return null;
    }

    setRequest(data);
    return data;
  };

  const applyTransition = async (
    targetStatus: RequestStatusCode,
    transitionFields: RequestTransitionFields,
  ): Promise<Request | null> => {
    if (!request) {
      console.error("Request transition error", "申請データが読み込まれていません");
      showError("申請データが読み込まれていません");
      return null;
    }

    if (!isTransitionAllowed(request.status, targetStatus)) {
      console.error(
        "Request transition error",
        "現在の状態ではこの操作は実行できません",
      );
      showError("現在の状態ではこの操作は実行できません");
      return null;
    }

    const { data, errors } = await client.models.Request.update({
      id: request.id,
      status: targetStatus,
      ...transitionFields,
    });

    if (errors) {
      console.error("Request transition error", errors);
      showError("操作に失敗しました");
      return null;
    }

    setRequest(data);
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
  };
}
