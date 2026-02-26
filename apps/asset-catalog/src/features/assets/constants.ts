import type { Schema } from "@workops/data-schema";

type AssetStatus = Schema["AssetStatusEnum"]["type"];

export const ASSET_STATUS_MAP: Record<AssetStatus, string> = {
  inStock: "在庫",
  lent: "貸与中",
  inRepair: "修理中",
  disposed: "廃棄済",
};

export const ASSET_STATUS_CHIP_COLOR = {
  inStock: "success",
  lent: "primary",
  inRepair: "warning",
  disposed: "default",
} as const satisfies Record<AssetStatus, "success" | "primary" | "warning" | "default">;
