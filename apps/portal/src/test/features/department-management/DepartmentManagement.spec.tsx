import { fireEvent, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "../../renderWithProviders";
import DepartmentManagement from "../../../features/department-management/DepartmentManagement";
import type { DepartmentType } from "../../../features/department-management/types";

const { sampleDepartment, createDepartment, updateDepartment, deleteDepartment } = vi.hoisted(
  () => {
    const sampleDepartment: DepartmentType = {
      code: "SALES",
      name: "営業部",
      sortOrder: 1,
      notes: "北日本",
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-02T00:00:00Z",
    };

    return {
      sampleDepartment,
      createDepartment: vi.fn(async () => null),
      updateDepartment: vi.fn(async () => sampleDepartment),
      deleteDepartment: vi.fn(async () => true),
    };
  }
);

vi.mock("../../../shared/auth/ability", () => ({
  Can: ({
    children,
    passThrough,
  }: {
    children?: ReactNode | ((allowed: boolean) => ReactNode);
    passThrough?: boolean;
  }) => {
    if (typeof children === "function") {
      return <>{children(true)}</>;
    }
    if (passThrough) {
      return <>{children}</>;
    }
    return <>{children}</>;
  },
}));

vi.mock(
  "../../../features/department-management/hooks/useDepartmentManagement",
  () => ({
    useDepartmentManagement: () => ({
      departments: [sampleDepartment],
      loading: false,
      createDepartment,
      updateDepartment,
      deleteDepartment,
    }),
  })
);

vi.mock(
  "../../../features/department-management/components/DepartmentTable",
  () => ({
    DepartmentTable: ({
      onDeleteRequest,
    }: {
      onDeleteRequest: (dept: DepartmentType) => void;
    }) => (
      <button onClick={() => onDeleteRequest(sampleDepartment)}>
        削除対象を開く
      </button>
    ),
  })
);

vi.mock(
  "../../../features/department-management/components/CreateDepartmentModal",
  () => ({
    CreateDepartmentModal: ({
      open,
      onClose,
      createDepartment,
      updateDepartment,
    }: {
      open: boolean;
      onClose: () => void;
      createDepartment: () => Promise<DepartmentType | null>;
      updateDepartment: () => Promise<DepartmentType | null>;
    }) =>
      open ? (
        <div>
          <p>新規作成モーダル</p>
          <button data-create={String(!!createDepartment)} data-update={String(!!updateDepartment)} onClick={() => onClose()}>閉じる</button>
        </div>
      ) : null,
  })
);

describe("DepartmentManagement", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("新規作成モーダルを開閉できる", async () => {
    renderWithProviders(<DepartmentManagement />);

    expect(screen.getByText("部署マスタ")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "新規作成" }));

    expect(screen.getByText("新規作成モーダル")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "閉じる" }));

    expect(screen.queryByText("新規作成モーダル")).not.toBeInTheDocument();
  });

  it("削除ダイアログを開いて削除完了できる", async () => {
    renderWithProviders(<DepartmentManagement />);

    fireEvent.click(screen.getByRole("button", { name: "削除対象を開く" }));

    expect(screen.getByText("部署を削除しますか？")).toBeInTheDocument();
    expect(screen.getByText("営業部")).toBeInTheDocument();
    expect(screen.getByText("SALES")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "削除する" }));

    await waitFor(() => {
      expect(deleteDepartment).toHaveBeenCalledWith("SALES");
    });
  });
});
