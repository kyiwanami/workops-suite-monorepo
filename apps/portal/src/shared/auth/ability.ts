import { AbilityBuilder, createMongoAbility } from "@casl/ability";
import { createContext } from "react";
import { createContextualCan } from "@casl/react";
import type { UserInfo } from "@workops-suite/shared-auth";
import type { AppAbility, AppAction, AppSubject } from "./types";

// Provider外でも型を崩さないよう、空ルールのAbilityを既定値にする
export const AbilityContext = createContext<AppAbility>(
  createMongoAbility<[AppAction, AppSubject]>([])
);

export const Can = createContextualCan(AbilityContext.Consumer);

export const buildAppAbility = (userInfo: UserInfo): AppAbility => {
  const { can, build } = new AbilityBuilder<AppAbility>(createMongoAbility);

  if (userInfo.isGlobalAdmin === true) {
    can("read", "UserManagementPage");
    can("read", "DepartmentManagementPage");
    can("read", "UserManagementMenu");
    can("read", "DepartmentManagementMenu");
    can("manage", "UserManagement");
    can("manage", "DepartmentManagement");
  }

  return build();
};
