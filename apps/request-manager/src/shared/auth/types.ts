import type { Schema } from "@workops/data-schema";
import type { MongoAbility } from "@casl/ability";

export type AppAction =
  | "read"
  | "create"
  | "update"
  | "submit"
  | "withdraw"
  | "approve"
  | "reject"
  | "return"
  | "delete"
  | "manage";
export type AppSubjectName =
  | "RequestPage"
  | "RequestTypePage"
  | "RequestTypeMenu"
  | "Request"
  | "RequestType";
export type AppSubject =
  | AppSubjectName
  | Schema["Request"]["type"]
  | Schema["RequestType"]["type"];

export type AppAbility = MongoAbility<[AppAction, AppSubject]>;
