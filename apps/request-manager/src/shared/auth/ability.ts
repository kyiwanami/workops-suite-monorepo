import { AbilityBuilder, createMongoAbility } from "@casl/ability";
import { createContext } from "react";
import { createContextualCan } from "@casl/react";
import type { AppAbility, AppAction, AppSubject, UserInfo } from "./types";

// Provider外でも型を崩さないよう、空ルールのAbilityを既定値にする
export const AbilityContext = createContext<AppAbility>(
  createMongoAbility<[AppAction, AppSubject]>([])
);

export const Can = createContextualCan(AbilityContext.Consumer);

export const buildAppAbility = (userInfo: UserInfo): AppAbility => {
  const { can, build } = new AbilityBuilder<AppAbility>(createMongoAbility);

  can("read", "RequestPage");
  can("read", "Request");

  // editor 以上: create, update, submit, withdraw
  if (userInfo.role === "editor" || userInfo.role === "manager" || userInfo.isGlobalAdmin) {
    can("create", "Request");
    can("update", "Request");
    can("submit", "Request");
    can("withdraw", "Request");
  }

  // manager 以上: approve, reject, return (セルフ承認禁止), delete, manage RequestType
  if (userInfo.role === "manager" || userInfo.isGlobalAdmin) {
    can("approve", "Request", { requesterSub: { $ne: userInfo.userId ?? "" } });
    can("reject", "Request", { requesterSub: { $ne: userInfo.userId ?? "" } });
    can("return", "Request", { requesterSub: { $ne: userInfo.userId ?? "" } });
    can("delete", "Request");
    can("manage", "RequestType");
    can("read", "RequestTypePage");
    can("read", "RequestTypeMenu");
  }

  return build();
};
