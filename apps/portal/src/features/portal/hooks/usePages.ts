import { useState, useEffect } from "react";
import { generateClient } from "aws-amplify/data";
import type { Schema } from "@workops/data-schema";
import type {
  PageDataType,
  CreatePageInput,
  UpdatePageInput,
} from "../types/project";
import { useNotification } from "../../../shared/notification";

const client = generateClient<Schema>();

export const usePages = (projectId?: string) => {
  const [pages, setPages] = useState<PageDataType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { showSuccess, showError } = useNotification();

  // 指定されたプロジェクトのページを監視
  useEffect(() => {
    if (!projectId) {
      setPages([]);
      setIsLoading(false);
      return;
    }

    const subscriptions: Array<{ unsubscribe: () => void }> = [];

    if (projectId === "ALL_PROJECTS") {
      // 全プロジェクトのページを取得
      const pagesSub = client.models.Page.observeQuery().subscribe({
        next: (data) => {
          const formattedPages = data.items.map((page) => ({
            pageId: page.pageId,
            projectId: page.projectId,
            name: page.name,
            description: page.description,
            relativePath: page.relativePath,
            iconName: page.iconName,
          }));

          setPages(formattedPages);
          setIsLoading(false);
        },
        error: (err) => {
          console.error("All pages subscription error:", err);
          showError("ページデータの同期中にエラーが発生しました");
          setIsLoading(false);
        },
      });
      subscriptions.push(pagesSub);
    } else {
      // 指定プロジェクトのページのみを監視
      const pagesSub = client.models.Page.observeQuery({
        filter: { projectId: { eq: projectId } },
      }).subscribe({
        next: (data) => {
          const formattedPages = data.items.map((page) => ({
            pageId: page.pageId,
            projectId: page.projectId,
            name: page.name,
            description: page.description,
            relativePath: page.relativePath,
            iconName: page.iconName,
          }));

          setPages(formattedPages);
          setIsLoading(false);
        },
        error: (err) => {
          console.error("Pages subscription error:", err);
          showError("ページデータの同期中にエラーが発生しました");
          setIsLoading(false);
        },
      });
      subscriptions.push(pagesSub);
    }

    return () => {
      subscriptions.forEach((sub) => sub.unsubscribe());
    };
  }, [projectId]);

  // ページ作成
  const createPage = async (
    input: CreatePageInput
  ): Promise<PageDataType | null> => {
    const { data, errors } = await client.models.Page.create({
      pageId: input.pageId,
      projectId: input.projectId,
      name: input.name,
      description: input.description,
      relativePath: input.relativePath,
      iconName: input.iconName,
    });

    if (errors) {
      console.error("GraphQL errors in createPage:", errors);
      showError("ページの作成に失敗しました");
      return null;
    }

    if (data) {
      const newPage = data;

      showSuccess(`ページ「${newPage.name}」を作成しました`);
      return newPage;
    }

    showError("プロジェクトの作成に失敗しました");
    return null;
  };

  // ページ更新
  const updatePage = async (
    input: UpdatePageInput
  ): Promise<PageDataType | null> => {
    const { data, errors } = await client.models.Page.update(input);

    if (errors) {
      console.error("GraphQL errors in updatePage:", errors);
      showError("ページの更新に失敗しました");
      return null;
    }

    if (data) {

      showSuccess(`ページ「${data.name}」を更新しました`);
      return data;
    }

    showError("ページの更新に失敗しました");
    return null;
  };

  // ページ削除
  const deletePage = async (
    pageId: string,
    projectId: string
  ): Promise<boolean> => {
    const page = pages.find((p) => p.pageId === pageId);
    const pageName = page?.name || pageId;

    const { data, errors } = await client.models.Page.delete({
      pageId,
      projectId,
    });

    if (errors) {
      console.error("GraphQL errors in deletePage:", errors);
      showError("ページの削除に失敗しました");
      return false;
    }
    if (!data) {
      showError("ページの削除に失敗しました");
      return false;
    }

    showSuccess(`ページ「${pageName}」を削除しました`);
    return true;
  };

  return {
    pages,
    isLoading,
    createPage,
    updatePage,
    deletePage,
  };
};
