import type { ReactNode } from "react";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "../../renderWithProviders";
import { RequestDetail } from "../../../features/requests/components/RequestDetail";

const navigate = vi.fn();
const showSuccess = vi.fn();
let requestLoading = false;
let requestValue:
  | {
      id: string;
      requestTypeId: string;
      status: "draft" | "submitted";
      title: string;
      amount?: number | null;
      description?: string | null;
      createdAt?: string | null;
      submittedAt?: string | null;
    }
  | null = {
  id: "req-1",
  requestTypeId: "rt-1",
  status: "draft",
  title: "備品購入",
  amount: 12000,
  description: "PC周辺機器",
  createdAt: "2026-03-21T00:00:00.000Z",
  submittedAt: null,
};

const submitRequest = vi.fn();
const withdrawRequest = vi.fn();
const approveRequest = vi.fn();
const rejectRequest = vi.fn();
const returnRequest = vi.fn();
const editDialogSpy = vi.fn();
const confirmDialogSpy = vi.fn();
const reasonDialogSpy = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>(
    "react-router-dom"
  );

  return {
    ...actual,
    useNavigate: () => navigate,
    useParams: () => ({ id: "req-1" }),
  };
});

vi.mock("@casl/react", () => ({
  useAbility: () => ({
    can: () => true,
  }),
}));

vi.mock("@workops-suite/shared-auth", () => ({
  useAuth: () => ({
    userInfo: {
      userId: "user-1",
      departmentCode: "D-001",
    },
  }),
}));

vi.mock("../../../shared/auth/ability", () => ({
  AbilityContext: {},
  Can: ({ children }: { children?: ReactNode | ((allowed: boolean) => ReactNode) }) =>
    typeof children === "function" ? <>{children(true)}</> : <>{children}</>,
}));

vi.mock("@workops-suite/shared-notification", () => ({
  useNotification: () => ({
    showSuccess,
  }),
}));

vi.mock("../../../features/requests/hooks/useRequest", () => ({
  useRequest: () => ({
    request: requestValue,
    loading: requestLoading,
    submitRequest,
    withdrawRequest,
    approveRequest,
    rejectRequest,
    returnRequest,
  }),
}));

vi.mock("../../../features/requests/hooks/useRequestTypes", () => ({
  useRequestTypes: () => ({
    requestTypes: [
      { id: "rt-1", name: "経費精算" },
      { id: "rt-2", name: "出張" },
    ],
  }),
}));

vi.mock("../../../features/requests/components/RequestForm", () => ({
  RequestFormDialog: ({
    open,
    id,
  }: {
    open: boolean;
    id?: string | null;
  }) => {
    editDialogSpy({ open, id });
    return <div>{open ? `edit:${id ?? "new"}` : "edit:closed"}</div>;
  },
}));

vi.mock("../../../shared/components/ConfirmDialog", () => ({
  ConfirmDialog: ({
    open,
    title,
    onConfirm,
  }: {
    open: boolean;
    title: string;
    onConfirm: () => void;
  }) => {
    confirmDialogSpy({ open, title });
    if (!open) {
      return <div>confirm:closed</div>;
    }
    return (
      <div>
        <span>{title}</span>
        <button onClick={onConfirm}>confirm</button>
      </div>
    );
  },
}));

vi.mock("../../../features/requests/components/ReasonDialog", () => ({
  ReasonDialog: ({
    open,
    title,
    onConfirm,
  }: {
    open: boolean;
    title: string;
    onConfirm: (reason: string) => void;
  }) => {
    reasonDialogSpy({ open, title });
    if (!open) {
      return <div>reason:closed</div>;
    }
    return (
      <div>
        <span>{title}</span>
        <button onClick={() => onConfirm("差戻し理由")}>reason-confirm</button>
      </div>
    );
  },
}));

describe("RequestDetail", () => {
  it("読み込み中はスピナーを表示する", () => {
    requestLoading = true;

    renderWithProviders(<RequestDetail />);

    expect(screen.getByRole("progressbar")).toBeInTheDocument();
    requestLoading = false;
  });

  it("申請がないときは一覧へ戻れる", () => {
    requestValue = null;

    renderWithProviders(<RequestDetail />);

    fireEvent.click(screen.getByRole("button", { name: "申請一覧に戻る" }));
    expect(navigate).toHaveBeenCalledWith("/requests");

    requestValue = {
      id: "req-1",
      requestTypeId: "rt-1",
      status: "draft",
      title: "備品購入",
      amount: 12000,
      description: "PC周辺機器",
      createdAt: "2026-03-21T00:00:00.000Z",
      submittedAt: null,
    };
  });

  it("詳細表示から提出導線を実行できる", async () => {
    submitRequest.mockResolvedValue({
      id: "req-1",
      requestTypeId: "rt-1",
      status: "submitted",
      title: "備品購入",
      amount: 12000,
    });

    renderWithProviders(<RequestDetail />);

    expect(screen.getByText("備品購入")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "編集" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "提出" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "提出" }));
    expect(screen.getByText("申請を提出しますか？")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "confirm" }));

    await waitFor(() => {
      expect(submitRequest).toHaveBeenCalled();
      expect(showSuccess).toHaveBeenCalledWith("申請を提出しました");
    });

    fireEvent.click(screen.getByRole("button", { name: "編集" }));
    expect(screen.getByText("edit:req-1")).toBeInTheDocument();
    expect(editDialogSpy).toHaveBeenCalledWith({ open: true, id: "req-1" });
  });

  it("金額が未設定ならハイフンを表示する", () => {
    requestValue = {
      id: "req-1",
      requestTypeId: "rt-1",
      status: "draft",
      title: "備品購入",
      amount: null,
      description: "PC周辺機器",
      createdAt: "2026-03-21T00:00:00.000Z",
      submittedAt: null,
    };

    renderWithProviders(<RequestDetail />);

    expect(screen.getByText("-")).toBeInTheDocument();

    requestValue = {
      id: "req-1",
      requestTypeId: "rt-1",
      status: "draft",
      title: "備品購入",
      amount: 12000,
      description: "PC周辺機器",
      createdAt: "2026-03-21T00:00:00.000Z",
      submittedAt: null,
    };
  });
});
