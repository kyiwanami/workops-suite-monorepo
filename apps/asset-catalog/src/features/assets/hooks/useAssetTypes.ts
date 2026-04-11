import { useEffect, useState } from "react";
import { generateClient } from "aws-amplify/data";
import type { Schema } from "@workops/data-schema";
import { useNotification } from "@workops-suite/shared-notification";

const client = generateClient<Schema>();

export type AssetType = Schema["AssetType"]["type"];

export function useAssetTypes() {
  const [assetTypes, setAssetTypes] = useState<AssetType[]>([]);
  const [loading, setLoading] = useState(true);
  const { showError } = useNotification();

  const fetchAllAssetTypes = async () => {
    const allAssetTypes: AssetType[] = [];
    let varNextToken: string | null | undefined;

    do {
      const { data, errors, nextToken } = await client.models.AssetType.list({
        limit: 1000,
        nextToken: varNextToken ?? undefined,
      });

      if (errors) {
        console.error("AssetType list error", errors);
        showError("資産種別の取得に失敗しました");
        setLoading(false);
        return;
      }

      allAssetTypes.push(...(data ?? []));
      varNextToken = nextToken;
    } while (varNextToken);

    allAssetTypes.sort((left, right) => {
      const leftOrder = left.sortOrder ?? Number.MAX_SAFE_INTEGER;
      const rightOrder = right.sortOrder ?? Number.MAX_SAFE_INTEGER;
      if (leftOrder !== rightOrder) {
        return leftOrder - rightOrder;
      }
      return left.name.localeCompare(right.name, "ja-JP");
    });

    setAssetTypes(allAssetTypes);
    setLoading(false);
  };

  useEffect(() => {
    void fetchAllAssetTypes();

    const subCreate = client.models.AssetType.onCreate().subscribe({
      next: () => {
        void fetchAllAssetTypes();
      },
      error: (error) => {
        console.error("AssetType onCreate subscription error", error);
        showError("資産種別の監視に失敗しました");
      },
    });

    const subUpdate = client.models.AssetType.onUpdate().subscribe({
      next: () => {
        void fetchAllAssetTypes();
      },
      error: (error) => {
        console.error("AssetType onUpdate subscription error", error);
        showError("資産種別の監視に失敗しました");
      },
    });

    const subDelete = client.models.AssetType.onDelete().subscribe({
      next: () => {
        void fetchAllAssetTypes();
      },
      error: (error) => {
        console.error("AssetType onDelete subscription error", error);
        showError("資産種別の監視に失敗しました");
      },
    });

    return () => {
      subCreate.unsubscribe();
      subUpdate.unsubscribe();
      subDelete.unsubscribe();
    };
  }, []);

  return {
    assetTypes,
    loading,
  };
}
