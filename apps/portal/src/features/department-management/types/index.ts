import type { Schema } from "@workops/data-schema";

// Department関連の型はAmplify Schemaの定義を参照する
export type DepartmentType = Schema["Department"]["type"];
export type CreateDepartmentInput = Schema["Department"]["createType"];
