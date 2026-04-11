import type { MongoAbility } from "@casl/ability";

export type AppAction = "read" | "create" | "update" | "delete" | "manage";
export type AppSubject =
  | "AssetPage"
  | "AssetTypePage"
  | "AssetTypeMenu"
  | "Asset"
  | "AssetType"
  | "Department";

export type AppAbility = MongoAbility<[AppAction, AppSubject]>;
