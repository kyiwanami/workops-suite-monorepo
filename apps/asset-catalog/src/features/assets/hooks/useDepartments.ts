import { useEffect, useState } from "react";
import { generateClient } from "aws-amplify/data";
import type { Schema } from "@workops/data-schema";
import { useNotification } from "@workops-suite/shared-notification";

const client = generateClient<Schema>();
export type Department = Schema["Department"]["type"];

export function useDepartments() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const { showError } = useNotification();

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
        setLoading(false);
        return;
      }

      const items = data ?? [];
      allDepartments.push(...items);
      varNextToken = nextToken ?? undefined;
    } while (varNextToken);

    allDepartments.sort((left, right) => {
      const leftOrder = left.sortOrder ?? Number.MAX_SAFE_INTEGER;
      const rightOrder = right.sortOrder ?? Number.MAX_SAFE_INTEGER;
      if (leftOrder !== rightOrder) {
        return leftOrder - rightOrder;
      }
      return left.name.localeCompare(right.name, "ja-JP");
    });

    setDepartments(allDepartments);
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
