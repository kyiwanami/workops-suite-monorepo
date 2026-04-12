import { useState, useEffect } from "react";
import { generateClient } from "aws-amplify/data";
import type { Schema } from "@workops/data-schema";
import type {
  AppDataType,
  CreateAppInput,
  UpdateAppInput,
} from "../types/app";
import { useNotification } from "@workops-suite/shared-notification";

const client = generateClient<Schema>();

// SelectionSet: App のみ（ページ情報は除外）
const appSelectionSet = [
  "appId",
  "name",
  "description",
  "urlDomain",
  "iconName",
  "color",
] as const;

export const useApps = () => {
  const [apps, setApps] = useState<AppDataType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [operationLoading, setOperationLoading] = useState(false);
  const [operationError, setOperationError] = useState<string | null>(null);
  const { showSuccess, showError } = useNotification();

  // プロジェクト一覧の監視とリアルタイム同期
  useEffect(() => {
    const subscription = client.models.App.observeQuery({
      selectionSet: [...appSelectionSet],
    }).subscribe({
      next: (data) => {
        const allApps = data.items.map((proj) => ({
          appId: proj.appId,
          name: proj.name,
          description: proj.description ?? null,
          urlDomain: proj.urlDomain,
          iconName: proj.iconName ?? null,
          color: proj.color ?? null,
          pages: [],
        }));

        setApps(allApps);
        setIsLoading(false);
      },
      error: (err) => {
        console.error("App subscription error:", err);
        showError("プロジェクトデータの同期中にエラーが発生しました");
        setIsLoading(false);
      },
    });

    return () => subscription.unsubscribe();
  }, []);

  // プロジェクト作成
  const createApp = async (
    input: CreateAppInput
  ): Promise<AppDataType | null> => {
    setOperationLoading(true);
    setOperationError(null);

    const { data, errors } = await client.models.App.create({
      appId: input.appId,
      name: input.name,
      description: input.description,
      urlDomain: input.urlDomain,
      iconName: input.iconName,
      color: input.color,
    });

    if (errors) {
      console.error("GraphQL errors in createApp:", errors);
      showError("プロジェクトの作成に失敗しました");
      setOperationLoading(false);
      setOperationError("プロジェクトの作成に失敗しました");
      return null;
    }

    if (data) {
      const newApp = {
        ...data,
        pages: [],
      };

      showSuccess(`プロジェクト「${newApp.name}」を作成しました`);
      setOperationLoading(false);
      return newApp;
    }

    console.error("App create returned no data");
    showError("プロジェクトの作成に失敗しました");
    setOperationLoading(false);
    setOperationError("プロジェクトの作成に失敗しました");
    return null;
  };

  // プロジェクト更新
  const updateApp = async (
    input: UpdateAppInput
  ): Promise<AppDataType | null> => {
    setOperationLoading(true);
    setOperationError(null);

    const { data, errors } = await client.models.App.update(input);

    if (errors) {
      console.error("GraphQL errors in updateApp:", errors);
      showError("プロジェクトの更新に失敗しました");
      setOperationLoading(false);
      setOperationError("プロジェクトの更新に失敗しました");
      return null;
    }

    if (data) {
      const existingApp = apps.find(
        (p) => p.appId === input.appId
      );
      const updatedApp = {
        ...data,
        pages: existingApp?.pages || [],
      };

      showSuccess(`プロジェクト「${updatedApp.name}」を更新しました`);
      setOperationLoading(false);
      return updatedApp;
    }

    console.error("App update returned no data");
    showError("プロジェクトの更新に失敗しました");
    setOperationLoading(false);
    setOperationError("プロジェクトの更新に失敗しました");
    return null;
  };

  // プロジェクト削除
  const deleteApp = async (appId: string): Promise<boolean> => {
    setOperationLoading(true);
    setOperationError(null);

    const app = apps.find((p) => p.appId === appId);
    const appName = app?.name || appId;

    // 関連するページを削除
    if (app && app.pages.length > 0) {
      const deleteResults = await Promise.all(
        app.pages.map(async (page) => {
          const { data, errors } = await client.models.Page.delete({
            pageId: page.pageId,
            appId: page.appId,
          });

          if (errors) {
            console.error(
              "GraphQL errors in deleteApp (page deletion):",
              errors
            );
            return false;
          }
          if (!data) {
            console.error("Page delete returned no data in deleteApp");
            return false;
          }

          return true;
        })
      );

      if (deleteResults.includes(false)) {
        showError("プロジェクトに関連するページの削除に失敗しました");
        setOperationLoading(false);
        setOperationError("プロジェクトに関連するページの削除に失敗しました");
        return false;
      }
    }

    // プロジェクトを削除
    const { data, errors } = await client.models.App.delete({ appId });

    if (errors) {
      console.error("GraphQL errors in deleteApp:", errors);
      showError("プロジェクトの削除に失敗しました");
      setOperationLoading(false);
      setOperationError("プロジェクトの削除に失敗しました");
      return false;
    }
    if (!data) {
      console.error("App delete returned no data");
      showError("プロジェクトの削除に失敗しました");
      setOperationLoading(false);
      setOperationError("プロジェクトの削除に失敗しました");
      return false;
    }

    showSuccess(`プロジェクト「${appName}」を削除しました`);
    setOperationLoading(false);
    return true;
  };

  return {
    apps,
    isLoading,
    operationLoading,
    operationError,
    createApp,
    updateApp,
    deleteApp,
  };
};
