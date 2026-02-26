import type { Schema } from "@workops/data-schema";

export type RequestStatusCode = Schema["RequestStatusCode"]["type"];

export type ApprovalEntry = {
  approverSub: string;
  statusCode: RequestStatusCode;
  reason?: string;
  appliedAt: string;
};

// 許可される状態遷移テーブル
const TRANSITIONS: Record<RequestStatusCode, ReadonlySet<RequestStatusCode>> = {
  draft: new Set(["submitted", "withdrawn"]),
  submitted: new Set(["approved", "rejected", "returned"]),
  returned: new Set(["submitted", "withdrawn"]),
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

// rejected / returned は理由必須
export function requiresReason(to: RequestStatusCode): boolean {
  return to === "rejected" || to === "returned";
}

export function isTerminalState(status: RequestStatusCode): boolean {
  return status === "approved" || status === "rejected" || status === "withdrawn";
}

export function getAllowedTransitions(
  from: RequestStatusCode,
): ReadonlySet<RequestStatusCode> {
  return TRANSITIONS[from];
}
