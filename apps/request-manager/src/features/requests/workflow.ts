import type { Schema } from "@workops/data-schema";

export type RequestStatusCode = Schema["RequestStatusCode"]["type"];

export type RequestAction = "submit" | "withdraw" | "approve" | "reject" | "return";

export type ApprovalEntry = {
  approverSub: string;
  statusCode: RequestStatusCode;
  reason?: string;
  appliedAt: string;
};

// 許可される状態遷移テーブル
const TRANSITIONS: Record<RequestStatusCode, ReadonlySet<RequestStatusCode>> = {
  draft: new Set(["submitted", "withdrawn"]),
  submitted: new Set(["approved", "rejected", "withdrawn", "draft"]),
  approved: new Set(),
  rejected: new Set(),
  withdrawn: new Set(),
};

export function isTransitionAllowed(
  from: RequestStatusCode,
  to: RequestStatusCode,
): boolean {
  return TRANSITIONS[from].has(to);
}

// reason が必要なのは却下と差戻しの操作だけ
export function requiresReason(action: RequestAction): boolean {
  return action === "reject" || action === "return";
}

export function isTerminalState(status: RequestStatusCode): boolean {
  return status === "approved" || status === "rejected" || status === "withdrawn";
}

export function getAllowedTransitions(
  from: RequestStatusCode,
): ReadonlySet<RequestStatusCode> {
  return TRANSITIONS[from];
}
