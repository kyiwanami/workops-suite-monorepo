import { useEffect, useState } from "react";
import { generateClient } from "aws-amplify/data";
import type { Schema } from "@workops/data-schema";
import { useNotification } from "@workops-suite/shared-notification";
import {
  type DepartmentType,
  type CreateDepartmentInput,
  type UpdateDepartmentInput,
} from "../types";

const client = generateClient<Schema>();

const sortDepartments = (departments: DepartmentType[]) =>
  [...departments].sort((a, b) => a.sortOrder - b.sortOrder);

export const useDepartmentManagement = () => {
  const [departments, setDepartments] = useState<DepartmentType[]>([]);
  const [loading, setLoading] = useState(false);
  const { showError, showSuccess } = useNotification();

  // 部署一覧は初回表示と購読イベント受信時に全件再取得する
  const fetchDepartments = async () => {
    setLoading(true);
    const allDepartments: DepartmentType[] = [];
    let varNextToken: string | null | undefined;

    do {
      const { data, errors, nextToken } = await client.models.Department.list({
        limit: 1000,
        nextToken: varNextToken ?? undefined,
      });
      if (errors) {
        console.error("Department list error", errors);
        showError("部署情報の取得に失敗しました");
        setDepartments([]);
        setLoading(false);
        return;
      }

      allDepartments.push(...(data ?? []));
      varNextToken = nextToken;
    } while (varNextToken);

    setDepartments(sortDepartments(allDepartments));
    setLoading(false);
  };

  useEffect(() => {
    void fetchDepartments();

    const subCreate = client.models.Department.onCreate().subscribe({
      next: () => {
        void fetchDepartments();
      },
      error: (error) => {
        console.error("Department onCreate subscription error", error);
        showError("部署情報の監視に失敗しました");
      },
    });

    const subUpdate = client.models.Department.onUpdate().subscribe({
      next: () => {
        void fetchDepartments();
      },
      error: (error) => {
        console.error("Department onUpdate subscription error", error);
        showError("部署情報の監視に失敗しました");
      },
    });

    const subDelete = client.models.Department.onDelete().subscribe({
      next: () => {
        void fetchDepartments();
      },
      error: (error) => {
        console.error("Department onDelete subscription error", error);
        showError("部署情報の監視に失敗しました");
      },
    });

    return () => {
      subCreate.unsubscribe();
      subUpdate.unsubscribe();
      subDelete.unsubscribe();
    };
  }, []);

  const createDepartment = async (
    input: CreateDepartmentInput
  ): Promise<DepartmentType | null> => {
    setLoading(true);
    const { data, errors } = await client.models.Department.create(input);
    if (errors) {
      console.error("Department create error", errors);
      showError("部署作成に失敗しました");
      setLoading(false);
      return null;
    }

    if (data) {
      showSuccess(`部署「${input.name}」を作成しました`);
      setLoading(false);
      return data;
    }

    showError("部署作成に失敗しました");
    setLoading(false);
    return null;
  };

  const updateDepartment = async (
    input: UpdateDepartmentInput
  ): Promise<DepartmentType | null> => {
    setLoading(true);
    const { data, errors } = await client.models.Department.update({
      code: input.code,
      name: input.name,
      sortOrder: input.sortOrder,
      notes: input.notes,
    });
    if (errors) {
      console.error("Department update error", errors);
      showError("部署更新に失敗しました");
      setLoading(false);
      return null;
    }

    if (data) {
      showSuccess(`部署「${data.name}」を更新しました`);
      setLoading(false);
      return data;
    }

    showError("部署更新に失敗しました");
    setLoading(false);
    return null;
  };

  const deleteDepartment = async (code: string): Promise<boolean> => {
    setLoading(true);
    const { data, errors } = await client.models.Department.delete({ code });
    if (errors) {
      console.error("Department delete error", errors);
      showError("部署削除に失敗しました");
      setLoading(false);
      return false;
    }

    if (data) {
      showSuccess(`部署コード「${code}」を削除しました`);
      setLoading(false);
      return true;
    }

    showError(`部署「${code}」の削除に失敗しました`);
    setLoading(false);
    return false;
  };

  return {
    departments,
    loading,
    createDepartment,
    updateDepartment,
    deleteDepartment,
  };
};
