import type { Schema } from "@workops/data-schema";
import type { Department } from "@workops-suite/shared-department";

export type ResolvedCognitoGroup = {
  isAdmin: boolean;
  departmentCode: string | null;
  departmentName: string | null;
  role: Schema["Role"]["type"] | null;
};

// Cognito の物理グループ名を、UI が再利用できる構造化情報へ解決する。
export const resolveCognitoGroup = (
  groupName: string,
  departments: Department[]
): ResolvedCognitoGroup | null => {
  if (groupName === "admin") {
    return {
      isAdmin: true,
      departmentCode: null,
      departmentName: null,
      role: null,
    };
  }

  const matchedGroup = /^([A-Z0-9]+)_(viewer|editor|manager)$/.exec(groupName);
  if (!matchedGroup) {
    return null;
  }

  const departmentCode = matchedGroup[1];
  const role =
    matchedGroup[2] === "viewer"
      ? "viewer"
      : matchedGroup[2] === "editor"
        ? "editor"
        : "manager";

  return {
    isAdmin: false,
    departmentCode,
    departmentName:
      departments.find((department) => department.code === departmentCode)?.name ??
      null,
    role,
  };
};
