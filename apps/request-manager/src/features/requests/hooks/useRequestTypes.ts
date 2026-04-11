import { useEffect, useState } from "react";
import { generateClient } from "aws-amplify/data";
import type { Schema } from "@workops/data-schema";
import { useNotification } from "@workops-suite/shared-notification";

const client = generateClient<Schema>();

export type RequestType = Schema["RequestType"]["type"];

// 申請フォームで使用する申請種別参照データ
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
        console.error("RequestType list error", errors);
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
        console.error("RequestType onCreate subscription error", error);
        showError("申請種別の監視に失敗しました");
      },
    });

    const subUpdate = client.models.RequestType.onUpdate().subscribe({
      next: () => {
        void fetchAllRequestTypes();
      },
      error: (error) => {
        console.error("RequestType onUpdate subscription error", error);
        showError("申請種別の監視に失敗しました");
      },
    });

    return () => {
      subCreate.unsubscribe();
      subUpdate.unsubscribe();
    };
  }, []);

  return { requestTypes, loading };
}
