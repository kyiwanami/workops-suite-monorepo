import { useState, useEffect } from "react";
import { generateClient } from "aws-amplify/data";
import type { Schema } from "@workops/data-schema";
import type {
  ProjectDataType,
  CreateProjectInput,
  UpdateProjectInput,
} from "../types/project";
import { useNotification } from "@workops-suite/shared-notification";

const client = generateClient<Schema>();

// SelectionSet: Project のみ（ページ情報は除外）
const projectSelectionSet = [
  "projectId",
  "name",
  "description",
  "urlDomain",
  "iconName",
  "color",
] as const;

export const useProjects = () => {
  const [projects, setProjects] = useState<ProjectDataType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [operationLoading, setOperationLoading] = useState(false);
  const [operationError, setOperationError] = useState<string | null>(null);
  const { showSuccess, showError } = useNotification();

  // プロジェクト一覧の監視とリアルタイム同期
  useEffect(() => {
    const subscription = client.models.Project.observeQuery({
      selectionSet: [...projectSelectionSet],
    }).subscribe({
      next: (data) => {
        const allProjects = data.items.map((proj) => ({
          projectId: proj.projectId,
          name: proj.name,
          description: proj.description ?? null,
          urlDomain: proj.urlDomain,
          iconName: proj.iconName ?? null,
          color: proj.color ?? null,
          pages: [],
        }));

        setProjects(allProjects);
        setIsLoading(false);
      },
      error: (err) => {
        console.error("Project subscription error:", err);
        showError("プロジェクトデータの同期中にエラーが発生しました");
        setIsLoading(false);
      },
    });

    return () => subscription.unsubscribe();
  }, []);

  // プロジェクト作成
  const createProject = async (
    input: CreateProjectInput
  ): Promise<ProjectDataType | null> => {
    setOperationLoading(true);
    setOperationError(null);

    const { data, errors } = await client.models.Project.create({
      projectId: input.projectId,
      name: input.name,
      description: input.description,
      urlDomain: input.urlDomain,
      iconName: input.iconName,
      color: input.color,
    });

    if (errors) {
      console.error("GraphQL errors in createProject:", errors);
      showError("プロジェクトの作成に失敗しました");
      setOperationLoading(false);
      setOperationError("プロジェクトの作成に失敗しました");
      return null;
    }

    if (data) {
      const newProject = {
        ...data,
        pages: [],
      };

      showSuccess(`プロジェクト「${newProject.name}」を作成しました`);
      setOperationLoading(false);
      return newProject;
    }

    console.error("Project create returned no data");
    showError("プロジェクトの作成に失敗しました");
    setOperationLoading(false);
    setOperationError("プロジェクトの作成に失敗しました");
    return null;
  };

  // プロジェクト更新
  const updateProject = async (
    input: UpdateProjectInput
  ): Promise<ProjectDataType | null> => {
    setOperationLoading(true);
    setOperationError(null);

    const { data, errors } = await client.models.Project.update(input);

    if (errors) {
      console.error("GraphQL errors in updateProject:", errors);
      showError("プロジェクトの更新に失敗しました");
      setOperationLoading(false);
      setOperationError("プロジェクトの更新に失敗しました");
      return null;
    }

    if (data) {
      const existingProject = projects.find(
        (p) => p.projectId === input.projectId
      );
      const updatedProject = {
        ...data,
        pages: existingProject?.pages || [],
      };

      showSuccess(`プロジェクト「${updatedProject.name}」を更新しました`);
      setOperationLoading(false);
      return updatedProject;
    }

    console.error("Project update returned no data");
    showError("プロジェクトの更新に失敗しました");
    setOperationLoading(false);
    setOperationError("プロジェクトの更新に失敗しました");
    return null;
  };

  // プロジェクト削除
  const deleteProject = async (projectId: string): Promise<boolean> => {
    setOperationLoading(true);
    setOperationError(null);

    const project = projects.find((p) => p.projectId === projectId);
    const projectName = project?.name || projectId;

    // 関連するページを削除
    if (project && project.pages.length > 0) {
      const deleteResults = await Promise.all(
        project.pages.map(async (page) => {
          const { data, errors } = await client.models.Page.delete({
            pageId: page.pageId,
            projectId: page.projectId,
          });

          if (errors) {
            console.error(
              "GraphQL errors in deleteProject (page deletion):",
              errors
            );
            return false;
          }
          if (!data) {
            console.error("Page delete returned no data in deleteProject");
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
    const { data, errors } = await client.models.Project.delete({ projectId });

    if (errors) {
      console.error("GraphQL errors in deleteProject:", errors);
      showError("プロジェクトの削除に失敗しました");
      setOperationLoading(false);
      setOperationError("プロジェクトの削除に失敗しました");
      return false;
    }
    if (!data) {
      console.error("Project delete returned no data");
      showError("プロジェクトの削除に失敗しました");
      setOperationLoading(false);
      setOperationError("プロジェクトの削除に失敗しました");
      return false;
    }

    showSuccess(`プロジェクト「${projectName}」を削除しました`);
    setOperationLoading(false);
    return true;
  };

  return {
    projects,
    isLoading,
    operationLoading,
    operationError,
    createProject,
    updateProject,
    deleteProject,
  };
};
