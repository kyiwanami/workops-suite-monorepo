import type { PreTokenGenerationV2TriggerHandler } from "aws-lambda";
import { Amplify } from "aws-amplify";
import { generateClient } from "aws-amplify/data";
import { getAmplifyDataClientConfig } from "@aws-amplify/backend/function/runtime";
import { env } from "$amplify/env/pre-token-generation";
import type { Schema } from "../../data/resource";

const { resourceConfig, libraryOptions } =
  await getAmplifyDataClientConfig(env);

Amplify.configure(resourceConfig, libraryOptions);

const client = generateClient<Schema>();

const roleValues = client.enums.Role.values();

type DeptRoleGroup = {
  deptCode: string;
  role: Schema["Role"]["type"];
};

function extractDeptAndRole(groupName: string): DeptRoleGroup | null {
  for (const suffix of roleValues) {
    if (groupName.endsWith(suffix)) {
      return {
        deptCode: groupName.split(`_${suffix}`)[0], // 接尾辞を除いた部分を部署コードとする
        role: suffix,
      };
    }
  }
  return null;
}

export const handler: PreTokenGenerationV2TriggerHandler = async (event) => {
  const groups = event.request.groupConfiguration?.groupsToOverride ?? [];
  const isGlobalAdmin = groups.includes("admin");

  const deptRoleGroups = groups
    .map(extractDeptAndRole)
    .filter((g): g is DeptRoleGroup => g !== null);

  if (!isGlobalAdmin && deptRoleGroups.length !== 1) {
    console.error(
      `[pre-token-generation] Login denied: user=${event.userName}, deptRoleGroups=${deptRoleGroups.length}`
    );
    throw new Error("User must belong to exactly one department+role group");
  }

  const claimsToAddOrOverride: Record<string, string> = {
    workops_is_global_admin: isGlobalAdmin ? "true" : "false",
  };

  if (!isGlobalAdmin) {
    const { deptCode, role } = deptRoleGroups[0];

    const { data: dept, errors } = await client.models.Department.get({ code: deptCode });

    if( errors && errors.length > 0) {
      console.error(
        `[pre-token-generation] Department get error.`, JSON.stringify(errors, null, 2)
      );
      throw new Error(`Department get error: ${deptCode}`);
    }

    if (!dept?.name) {
      console.error(
        `[pre-token-generation] Department not found: code=${deptCode}, user=${event.userName}`
      );
      throw new Error(`Department not found for code: ${deptCode}`);
    }

    claimsToAddOrOverride.workops_department_code = deptCode;
    claimsToAddOrOverride.workops_department_name = dept.name;
    claimsToAddOrOverride.workops_role = role;

    // ロール階層に応じた部署スコープクレームを付与（Amplify Data ownerDefinedIn 認可用）
    claimsToAddOrOverride.workops_dept_viewer = deptCode;
    if (role === "editor" || role === "manager") {
      claimsToAddOrOverride.workops_dept_editor = deptCode;
    }
    if (role === "manager") {
      claimsToAddOrOverride.workops_dept_manager = deptCode;
    }
  }

  // 仮想ロールグループをトークンに注入（Amplify Data groups 認可用）
  // ADMIN は既存 "admin" グループで対応するため追記不要
  const virtualRoleGroup = !isGlobalAdmin
    ? [`workops_role_${deptRoleGroups[0].role}`]
    : [];
  const groupsToOverride = [...groups, ...virtualRoleGroup];

  event.response = {
    claimsAndScopeOverrideDetails: {
      idTokenGeneration: {
        claimsToAddOrOverride,
      },
      accessTokenGeneration: {
        claimsToAddOrOverride,
      },
      groupOverrideDetails: { groupsToOverride },
    },
  };

  return event;
};
