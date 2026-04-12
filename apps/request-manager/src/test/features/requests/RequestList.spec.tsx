import type { ReactNode } from "react";
import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "../../renderWithProviders";
import { RequestList } from "../../../features/requests/components/RequestList";

const navigate = vi.fn();
let requestLoading = false;
let requestedDepartmentId = "";

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>(
    "react-router-dom"
  );

  return {
    ...actual,
    useNavigate: () => navigate,
  };
});

vi.mock("@workops-suite/shared-auth", () => ({
  useAuth: () => ({
    userInfo: {
      departmentCode: "D-001",
    },
  }),
}));

vi.mock("@workops-suite/shared-department", () => ({
  useDepartments: () => ({
    departments: [
      { code: "D-001", name: "総務部", sortOrder: 1 },
      { code: "D-002", name: "営業部", sortOrder: 2 },
    ],
    loading: false,
  }),
}));

vi.mock("../../../shared/auth/ability", () => ({
  Can: ({ children }: { children?: ReactNode | ((allowed: boolean) => ReactNode) }) =>
    typeof children === "function" ? <>{children(true)}</> : <>{children}</>,
}));

vi.mock("../../../features/requests/hooks/useRequests", () => ({
  useRequests: (departmentId: string) => {
    requestedDepartmentId = departmentId;

    return {
      requests: [
        {
          id: "req-1",
          createdAt: "2026-03-21T00:00:00.000Z",
          status: "draft",
          requestTypeId: "rt-1",
          title: "備品購入",
          amount: 12000,
        },
        {
          id: "req-2",
          createdAt: "2026-03-20T00:00:00.000Z",
          status: "submitted",
          requestTypeId: "rt-2",
          title: "出張申請",
          amount: 50000,
        },
      ],
      loading: requestLoading,
    };
  },
}));

vi.mock("../../../features/requests/hooks/useRequestTypes", () => ({
  useRequestTypes: () => ({
    requestTypes: [
      { id: "rt-1", name: "経費精算", isActive: true },
      { id: "rt-2", name: "出張", isActive: true },
    ],
  }),
}));

vi.mock("../../../features/requests/components/RequestForm", () => ({
  RequestFormDialog: ({ open }: { open: boolean }) => (
    <div>{open ? "request-form:open" : "request-form:closed"}</div>
  ),
}));

describe("RequestList", () => {
  it("読み込み中はローディングを表示する", () => {
    requestLoading = true;
    requestedDepartmentId = "";

    renderWithProviders(<RequestList />);

    expect(screen.getByText("読み込み中...")).toBeInTheDocument();
    requestLoading = false;
  });

  it("絞り込み結果がないときは空状態を表示する", () => {
    requestedDepartmentId = "";
    renderWithProviders(<RequestList />);

    fireEvent.mouseDown(screen.getByRole("combobox", { name: "状態" }));
    fireEvent.click(screen.getByRole("option", { name: "却下" }));

    expect(screen.getByText("申請がありません")).toBeInTheDocument();
  });

  it("部署プルダウンで取得対象を切り替えつつ一覧をフィルタして詳細へ遷移し、新規申請を開く", () => {
    requestedDepartmentId = "";
    renderWithProviders(<RequestList />);

    expect(requestedDepartmentId).toBe("D-001");
    expect(screen.getByText("備品購入")).toBeInTheDocument();
    expect(screen.getByText("出張申請")).toBeInTheDocument();

    fireEvent.mouseDown(screen.getByRole("combobox", { name: "部署" }));
    fireEvent.click(screen.getByRole("option", { name: "営業部" }));

    expect(requestedDepartmentId).toBe("D-002");

    fireEvent.mouseDown(screen.getByRole("combobox", { name: "状態" }));
    fireEvent.click(screen.getByRole("option", { name: "申請中" }));

    expect(screen.queryByText("備品購入")).not.toBeInTheDocument();
    expect(screen.getByText("出張申請")).toBeInTheDocument();

    fireEvent.click(screen.getByText("出張申請"));
    expect(navigate).toHaveBeenCalledWith("/requests/req-2");

    fireEvent.click(screen.getByRole("button", { name: "新規申請" }));
    expect(screen.getByText("request-form:open")).toBeInTheDocument();
  });

  it("金額が未設定ならハイフンを表示する", () => {
    renderWithProviders(<RequestList />);

    expect(screen.getByText("-")).toBeInTheDocument();
  });
});
