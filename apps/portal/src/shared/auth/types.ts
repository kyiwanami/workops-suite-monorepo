import type { MongoAbility } from "@casl/ability";

export type AppAction = "read" | "manage";
export type AppSubject =
  | "UserManagementPage"
  | "DepartmentManagementPage"
  | "UserManagementMenu"
  | "DepartmentManagementMenu"
  | "UserManagement"
  | "DepartmentManagement";

export type AppAbility = MongoAbility<[AppAction, AppSubject]>;
