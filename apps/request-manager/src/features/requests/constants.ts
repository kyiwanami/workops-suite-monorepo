import type { RequestStatusCode } from "./workflow";

export const REQUEST_STATUS_MAP: Record<RequestStatusCode, string> = {
  draft: "下書き",
  submitted: "申請中",
  returned: "差戻し",
  approved: "承認済",
  rejected: "却下",
  withdrawn: "取下げ",
};

export const REQUEST_STATUS_CHIP_COLOR = {
  draft: "default",
  submitted: "primary",
  returned: "warning",
  approved: "success",
  rejected: "error",
  withdrawn: "default",
} as const satisfies Record<
  RequestStatusCode,
  "default" | "primary" | "warning" | "success" | "error"
>;
