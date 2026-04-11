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

  can("read", "AssetPage");
  can("read", "Asset");

  // editor 以上: create, update
  if (userInfo.role === "editor" || userInfo.role === "manager" || userInfo.isGlobalAdmin) {
    can("create", "Asset");
    can("update", "Asset");
  }

  // manager 以上: delete, manage AssetType
  if (userInfo.role === "manager" || userInfo.isGlobalAdmin) {
    can("delete", "Asset");
    can("manage", "AssetType");
    can("read", "AssetTypePage");
    can("read", "AssetTypeMenu");
  }

  // ADMIN のみ: Department
  if (userInfo.isGlobalAdmin) {
    can("read", "Department");
  }

  return build();
};
