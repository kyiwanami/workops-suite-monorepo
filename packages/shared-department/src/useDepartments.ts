import { useEffect, useState } from "react";
import { generateClient } from "aws-amplify/data";
import type { Schema } from "@workops/data-schema";
import { useNotification } from "@workops-suite/shared-notification";

const client = generateClient<Schema>();

// 部署マスタ型は Amplify Schema をそのまま共有して各アプリで揃える。
export type Department = Schema["Department"]["type"];

// 表示順と名称順で部署一覧を安定化し、各アプリで同じ並び順を使う。
const sortDepartments = (departments: Department[]): Department[] => {
  return [...departments].sort((left, right) => {
    const leftSortOrder = left.sortOrder ?? Number.MAX_SAFE_INTEGER;
    const rightSortOrder = right.sortOrder ?? Number.MAX_SAFE_INTEGER;

    if (leftSortOrder !== rightSortOrder) {
      return leftSortOrder - rightSortOrder;
    }

    return left.name.localeCompare(right.name, "ja-JP");
  });
};

export function useDepartments() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const { showError } = useNotification();

  // 部署マスタは一覧画面の初期表示で全件読み込んでプルダウン選択肢に使う。
  const fetchAllDepartments = async () => {
    const allDepartments: Department[] = [];
    let varNextToken: string | null | undefined;

    do {
      const { data, errors, nextToken } = await client.models.Department.list({
        limit: 1000,
        nextToken: varNextToken ?? undefined,
      });

      if (errors) {
        console.error("Department list error", errors);
        showError("部署マスタの取得に失敗しました");
        setDepartments([]);
        setLoading(false);
        return;
      }

      allDepartments.push(...(data ?? []));
      varNextToken = nextToken ?? undefined;
    } while (varNextToken);

    setDepartments(sortDepartments(allDepartments));
    setLoading(false);
  };

  useEffect(() => {
    void fetchAllDepartments();
  }, []);

  return {
    departments,
    loading,
  };
}
