import { useEffect, useState } from "react";
import { generateClient } from "aws-amplify/data";
import type { Schema } from "@workops/data-schema";
import { useNotification } from "@workops-suite/shared-notification";

const client = generateClient<Schema>();

export type Asset = Schema["Asset"]["type"];
export type AssetCreateInput = Schema["Asset"]["createType"];
export type AssetUpdateInput = Schema["Asset"]["updateType"];

export function useAssets() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const { showError } = useNotification();

  const fetchAllAssets = async () => {
    const allAssets: Asset[] = [];
    let varNextToken: string | null | undefined;

    do {
      const { data, errors, nextToken } = await client.models.Asset.list({
        limit: 1000,
        nextToken: varNextToken ?? undefined,
      });

      if (errors) {
        console.error("Asset list error", errors);
        showError("資産一覧の取得に失敗しました");
        setLoading(false);
        return;
      }

      allAssets.push(...(data ?? []));
      varNextToken = nextToken;
    } while (varNextToken);

    setAssets(allAssets);
    setLoading(false);
  };

  useEffect(() => {
    void fetchAllAssets();

    const subCreate = client.models.Asset.onCreate().subscribe({
      next: () => {
        void fetchAllAssets();
      },
      error: (error) => {
        console.error("Asset onCreate subscription error", error);
        showError("資産一覧の監視に失敗しました");
      },
    });

    const subUpdate = client.models.Asset.onUpdate().subscribe({
      next: () => {
        void fetchAllAssets();
      },
      error: (error) => {
        console.error("Asset onUpdate subscription error", error);
        showError("資産一覧の監視に失敗しました");
      },
    });

    const subDelete = client.models.Asset.onDelete().subscribe({
      next: () => {
        void fetchAllAssets();
      },
      error: (error) => {
        console.error("Asset onDelete subscription error", error);
        showError("資産一覧の監視に失敗しました");
      },
    });

    return () => {
      subCreate.unsubscribe();
      subUpdate.unsubscribe();
      subDelete.unsubscribe();
    };
  }, []);

  return {
    assets,
    loading,
  };
}

export function useAsset(id?: string) {
  const [asset, setAsset] = useState<Asset | null>(null);
  const [loading, setLoading] = useState(!!id);
  const { showError } = useNotification();

  useEffect(() => {
    if (!id) {
      setAsset(null);
      setLoading(false);
      return;
    }

    const fetchAsset = async () => {
      setLoading(true);
      const { data, errors } = await client.models.Asset.get({ id });

      if (errors) {
        console.error("Asset get error", errors);
        showError("資産詳細の取得に失敗しました");
        setLoading(false);
        return;
      }

      setAsset(data);
      setLoading(false);
    };

    void fetchAsset();

    const filter = { id: { eq: id } };

    const subUpdate = client.models.Asset.onUpdate({ filter }).subscribe({
      next: () => {
        void fetchAsset();
      },
      error: (error) => {
        console.error("Asset detail onUpdate subscription error", error);
        showError("資産詳細の監視に失敗しました");
      },
    });

    const subDelete = client.models.Asset.onDelete({ filter }).subscribe({
      next: () => {
        setAsset(null);
      },
      error: (error) => {
        console.error("Asset detail onDelete subscription error", error);
        showError("資産詳細の監視に失敗しました");
      },
    });

    return () => {
      subUpdate.unsubscribe();
      subDelete.unsubscribe();
    };
  }, [id]);

  const getAsset = async (assetId: string) => {
    const { data, errors } = await client.models.Asset.get({ id: assetId });
    if (errors) {
      console.error("Asset get error", errors);
      showError("資産詳細の取得に失敗しました");
      return null;
    }
    return data;
  };

  const createAsset = async (input: AssetCreateInput) => {
    const { data, errors } = await client.models.Asset.create(input);
    if (errors) {
      console.error("Asset create error", errors);
      showError("資産の登録に失敗しました");
      return null;
    }
    return data;
  };

  const updateAsset = async (input: AssetUpdateInput) => {
    const { data, errors } = await client.models.Asset.update(input);
    if (errors) {
      console.error("Asset update error", errors);
      showError("資産の更新に失敗しました");
      return null;
    }
    return data;
  };

  const deleteAsset = async (assetId: string) => {
    const { data, errors } = await client.models.Asset.delete({ id: assetId });
    if (errors) {
      console.error("Asset delete error", errors);
      showError("資産の削除に失敗しました");
      return null;
    }
    return data;
  };

  return {
    asset,
    loading,
    getAsset,
    createAsset,
    updateAsset,
    deleteAsset,
  };
}
