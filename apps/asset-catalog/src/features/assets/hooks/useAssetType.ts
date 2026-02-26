import { useEffect, useState } from "react";
import { generateClient } from "aws-amplify/data";
import type { Schema } from "@workops/data-schema";
import { useNotification } from "../../../shared/notification";

const client = generateClient<Schema>();

export type AssetType = Schema["AssetType"]["type"];
export type AssetTypeCreateInput = Schema["AssetType"]["createType"];
export type AssetTypeUpdateInput = Schema["AssetType"]["updateType"];

export function useAssetType(id?: string) {
  const [assetType, setAssetType] = useState<AssetType | null>(null);
  const [loading, setLoading] = useState(!!id);
  const { showError } = useNotification();

  useEffect(() => {
    // 詳細画面や編集ダイアログで使う単一取得状態を管理する
    if (!id) {
      setAssetType(null);
      setLoading(false);
      return;
    }

    const fetchAssetType = async () => {
      setLoading(true);
      const { data, errors } = await client.models.AssetType.get({ id });

      if (errors) {
        console.error("AssetType get error", errors);
        showError("資産種別の取得に失敗しました");
        setLoading(false);
        return;
      }

      setAssetType(data);
      setLoading(false);
    };

    void fetchAssetType();

    const filter = { id: { eq: id } };

    const subUpdate = client.models.AssetType.onUpdate({ filter }).subscribe({
      next: () => {
        void fetchAssetType();
      },
      error: (error) => {
        console.error("AssetType detail onUpdate subscription error", error);
        showError("資産種別の監視に失敗しました");
      },
    });

    const subDelete = client.models.AssetType.onDelete({ filter }).subscribe({
      next: () => {
        setAssetType(null);
      },
      error: (error) => {
        console.error("AssetType detail onDelete subscription error", error);
        showError("資産種別の監視に失敗しました");
      },
    });

    return () => {
      subUpdate.unsubscribe();
      subDelete.unsubscribe();
    };
  }, [id]);

  const getAssetType = async (assetTypeId: string) => {
    const { data, errors } = await client.models.AssetType.get({ id: assetTypeId });
    if (errors) {
      console.error("AssetType get error", errors);
      showError("資産種別の取得に失敗しました");
      return null;
    }
    return data;
  };

  const createAssetType = async (input: AssetTypeCreateInput) => {
    // codeは作成時に完全一致で重複禁止とする
    const { data: existing, errors: findErrors } = await client.models.AssetType.list({
      limit: 1,
      filter: {
        code: {
          eq: input.code,
        },
      },
    });
    if (findErrors) {
      console.error("AssetType duplicate check error", findErrors);
      showError("資産種別の登録に失敗しました");
      return null;
    }
    if ((existing ?? []).length > 0) {
      showError("コードが重複しています");
      return null;
    }

    const { data, errors } = await client.models.AssetType.create(input);
    if (errors) {
      console.error("AssetType create error", errors);
      showError("資産種別の登録に失敗しました");
      return null;
    }
    return data;
  };

  const updateAssetType = async (input: AssetTypeUpdateInput) => {
    const { data, errors } = await client.models.AssetType.update(input);
    if (errors) {
      console.error("AssetType update error", errors);
      showError("資産種別の更新に失敗しました");
      return null;
    }
    return data;
  };

  const deleteAssetType = async (assetTypeId: string) => {
    const { data, errors } = await client.models.AssetType.delete({ id: assetTypeId });
    if (errors) {
      console.error("AssetType delete error", errors);
      showError("資産種別の削除に失敗しました");
      return null;
    }
    return data;
  };

  return {
    assetType,
    loading,
    getAssetType,
    createAssetType,
    updateAssetType,
    deleteAssetType,
  };
}
