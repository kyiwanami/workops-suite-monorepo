import { useState, useCallback } from "react";
import { generateClient } from "aws-amplify/data";
import type { Schema } from "@workops/data-schema";
import { useNotification } from "@workops-suite/shared-notification";
import {
  type DepartmentType,
  type CreateDepartmentInput,
  type UpdateDepartmentInput,
} from "../types";

const client = generateClient<Schema>();

export const useDepartmentManagement = () => {
  const [departments, setDepartments] = useState<DepartmentType[]>([]);
  const [loading, setLoading] = useState(false);
  const { showError, showSuccess } = useNotification();

  const fetchDepartments = useCallback(async () => {
    setLoading(true);
    const { data, errors } = await client.models.Department.list();
    if (errors) {
      console.error("Department list error", errors);
      showError("部署情報の取得に失敗しました");
      setDepartments([]);
      setLoading(false);
      return;
    }

    const sorted = [...(data ?? [])].sort(
      (a, b) => (a.sortOrder ?? 999) - (b.sortOrder ?? 999)
    );
    setDepartments(sorted);
    setLoading(false);
  }, [showError]);

  const createDepartment = useCallback(
    async (input: CreateDepartmentInput): Promise<DepartmentType | null> => {
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
    },
    [showSuccess, showError]
  );

  const updateDepartment = useCallback(
    async (input: UpdateDepartmentInput): Promise<DepartmentType | null> => {
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
    },
    [showSuccess, showError]
  );

  const deleteDepartment = useCallback(
    async (code: string): Promise<boolean> => {
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
    },
    [showSuccess, showError]
  );

  return {
    departments,
    loading,
    fetchDepartments,
    createDepartment,
    updateDepartment,
    deleteDepartment,
  };
};
