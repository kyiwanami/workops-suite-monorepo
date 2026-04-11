import { useEffect, useState } from "react";
import { generateClient } from "aws-amplify/data";
import type { Schema } from "@workops/data-schema";
import { useNotification } from "@workops-suite/shared-notification";

const client = generateClient<Schema>();

export type RequestType = Schema["RequestType"]["type"];
export type RequestTypeCreateInput = Schema["RequestType"]["createType"];
export type RequestTypeUpdateInput = Schema["RequestType"]["updateType"];

// 管理者向け申請種別 CRUD
export function useRequestTypes() {
  const [requestTypes, setRequestTypes] = useState<RequestType[]>([]);
  const [loading, setLoading] = useState(true);
  const { showError } = useNotification();

  const fetchAllRequestTypes = async () => {
    const all: RequestType[] = [];
    let varNextToken: string | null | undefined;

    do {
      const { data, errors, nextToken } = await client.models.RequestType.list({
        limit: 1000,
        nextToken: varNextToken ?? undefined,
      });

      if (errors) {
        console.error("Admin RequestType list error", errors);
        showError("申請種別の取得に失敗しました");
        setLoading(false);
        return;
      }

      all.push(...(data ?? []));
      varNextToken = nextToken;
    } while (varNextToken);

    all.sort((left, right) => {
      const leftOrder = left.sortOrder ?? Number.MAX_SAFE_INTEGER;
      const rightOrder = right.sortOrder ?? Number.MAX_SAFE_INTEGER;
      if (leftOrder !== rightOrder) return leftOrder - rightOrder;
      return left.name.localeCompare(right.name, "ja-JP");
    });

    setRequestTypes(all);
    setLoading(false);
  };

  useEffect(() => {
    void fetchAllRequestTypes();

    const subCreate = client.models.RequestType.onCreate().subscribe({
      next: () => {
        void fetchAllRequestTypes();
      },
      error: (error) => {
        console.error("Admin RequestType onCreate subscription error", error);
        showError("申請種別の監視に失敗しました");
      },
    });

    const subUpdate = client.models.RequestType.onUpdate().subscribe({
      next: () => {
        void fetchAllRequestTypes();
      },
      error: (error) => {
        console.error("Admin RequestType onUpdate subscription error", error);
        showError("申請種別の監視に失敗しました");
      },
    });

    const subDelete = client.models.RequestType.onDelete().subscribe({
      next: () => {
        void fetchAllRequestTypes();
      },
      error: (error) => {
        console.error("Admin RequestType onDelete subscription error", error);
        showError("申請種別の監視に失敗しました");
      },
    });

    return () => {
      subCreate.unsubscribe();
      subUpdate.unsubscribe();
      subDelete.unsubscribe();
    };
  }, []);

  return { requestTypes, loading };
}

export function useRequestType(id?: string) {
  const [requestType, setRequestType] = useState<RequestType | null>(null);
  const [loading, setLoading] = useState(!!id);
  const { showError } = useNotification();

  useEffect(() => {
    if (!id) {
      setRequestType(null);
      setLoading(false);
      return;
    }

    const fetchRequestType = async () => {
      setLoading(true);
      const { data, errors } = await client.models.RequestType.get({ id });

      if (errors) {
        console.error("RequestType get error", errors);
        showError("申請種別の取得に失敗しました");
        setLoading(false);
        return;
      }

      setRequestType(data);
      setLoading(false);
    };

    void fetchRequestType();
  }, [id]);

  const getRequestType = async (requestTypeId: string) => {
    const { data, errors } = await client.models.RequestType.get({
      id: requestTypeId,
    });
    if (errors) {
      console.error("RequestType get error", errors);
      showError("申請種別の取得に失敗しました");
      return null;
    }
    return data;
  };

  const createRequestType = async (
    input: RequestTypeCreateInput,
  ): Promise<RequestType | null> => {
    const { data, errors } = await client.models.RequestType.create(input);
    if (errors) {
      console.error("RequestType create error", errors);
      showError("申請種別の登録に失敗しました");
      return null;
    }
    return data;
  };

  const updateRequestType = async (
    input: RequestTypeUpdateInput,
  ): Promise<RequestType | null> => {
    const { data, errors } = await client.models.RequestType.update(input);
    if (errors) {
      console.error("RequestType update error", errors);
      showError("申請種別の更新に失敗しました");
      return null;
    }
    return data;
  };

  const deleteRequestType = async (
    requestTypeId: string,
  ): Promise<RequestType | null> => {
    const { data, errors } = await client.models.RequestType.delete({
      id: requestTypeId,
    });
    if (errors) {
      console.error("RequestType delete error", errors);
      showError("申請種別の削除に失敗しました");
      return null;
    }
    return data;
  };

  return {
    requestType,
    loading,
    getRequestType,
    createRequestType,
    updateRequestType,
    deleteRequestType,
  };
}
