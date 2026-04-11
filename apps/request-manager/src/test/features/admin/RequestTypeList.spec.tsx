import type { ReactNode } from "react";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "../../renderWithProviders";
import { RequestTypeList } from "../../../features/admin/components/RequestTypeList";

const showError = vi.fn();
const showSuccess = vi.fn();
const deleteRequestType = vi.fn();
const openFormSpy = vi.fn();
const confirmSpy = vi.fn();

vi.mock("@workops-suite/shared-notification", () => ({
  useNotification: () => ({
    showError,
    showSuccess,
  }),
}));

vi.mock("../../../shared/auth/ability", () => ({
  Can: ({ children }: { children?: ReactNode | ((allowed: boolean) => ReactNode) }) =>
    typeof children === "function" ? <>{children(true)}</> : <>{children}</>,
}));

vi.mock("../../../features/admin/hooks/useRequestTypes", () => ({
  useRequestTypes: () => ({
    requestTypes: [
      {
        id: "rt-1",
        code: "EXPENSE",
        name: "経費精算",
        description: "交通費",
        sortOrder: 10,
        isActive: true,
      },
      {
        id: "rt-2",
        code: "TRAVEL",
        name: "出張",
        description: null,
        sortOrder: 20,
        isActive: false,
      },
    ],
    loading: false,
  }),
  useRequestType: () => ({
    deleteRequestType,
  }),
}));

vi.mock("../../../features/admin/components/RequestTypeFormDialog", () => ({
  RequestTypeFormDialog: ({
    open,
    id,
  }: {
    open: boolean;
    id?: string | null;
  }) => {
    openFormSpy({ open, id });
    return <div>{open ? `form:${id ?? "new"}` : "form:closed"}</div>;
  },
}));

vi.mock("../../../shared/components/ConfirmDialog", () => ({
  ConfirmDialog: ({
    open,
    title,
    onConfirm,
    onCancel,
  }: {
    open: boolean;
    title: string;
    onConfirm: () => void;
    onCancel: () => void;
  }) => {
    confirmSpy({ open, title });
    if (!open) {
      return <div>confirm:closed</div>;
    }
    return (
      <div>
        <span>{title}</span>
        <button onClick={onConfirm}>confirm</button>
        <button onClick={onCancel}>cancel</button>
      </div>
    );
  },
}));

describe("RequestTypeList", () => {
  it("申請種別一覧を表示する", () => {
    renderWithProviders(<RequestTypeList />);

    expect(screen.getByText("経費精算")).toBeInTheDocument();
    expect(screen.getByText("出張")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "追加" })).toBeInTheDocument();
  });

  it("追加と削除の導線を開く", async () => {
    deleteRequestType.mockResolvedValue({
      id: "rt-1",
      code: "EXPENSE",
      name: "経費精算",
      description: "交通費",
      sortOrder: 10,
      isActive: true,
    });

    renderWithProviders(<RequestTypeList />);

    fireEvent.click(screen.getByRole("button", { name: "追加" }));
    expect(screen.getByText("form:new")).toBeInTheDocument();
    expect(openFormSpy).toHaveBeenCalledWith({ open: true, id: null });

    fireEvent.click(screen.getAllByRole("button", { name: "編集" })[0]);
    expect(screen.getByText("form:rt-1")).toBeInTheDocument();
    expect(openFormSpy).toHaveBeenCalledWith({ open: true, id: "rt-1" });

    fireEvent.click(screen.getAllByRole("button", { name: "削除" })[0]);
    expect(screen.getByText("申請種別を削除しますか？")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "confirm" }));

    await waitFor(() => {
      expect(deleteRequestType).toHaveBeenCalledWith("rt-1");
      expect(showSuccess).toHaveBeenCalledWith("申請種別を削除しました");
    });
  });
});
