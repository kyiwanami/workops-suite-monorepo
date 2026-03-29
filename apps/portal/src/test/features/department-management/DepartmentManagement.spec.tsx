import { fireEvent, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "../../renderWithProviders";
import DepartmentManagement from "../../../features/department-management/DepartmentManagement";
import type { DepartmentType } from "../../../features/department-management/types";

const { sampleDepartment, fetchDepartments, deleteDepartment } = vi.hoisted(
  () => ({
    sampleDepartment: {
      code: "SALES",
      name: "営業部",
      sortOrder: 1,
      notes: "北日本",
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-02T00:00:00Z",
    } satisfies DepartmentType,
    fetchDepartments: vi.fn(),
    deleteDepartment: vi.fn(async () => true),
  })
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
      fetchDepartments,
      updateDepartment: vi.fn(async () => sampleDepartment),
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
    }: {
      open: boolean;
      onClose: (success?: boolean) => void;
    }) =>
      open ? (
        <div>
          <p>新規作成モーダル</p>
          <button onClick={() => onClose(false)}>閉じる</button>
        </div>
      ) : null,
  })
);

describe("DepartmentManagement", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("初回表示時に部署一覧を取得し、新規作成モーダルを開閉できる", async () => {
    renderWithProviders(<DepartmentManagement />);

    expect(screen.getByText("部署マスタ")).toBeInTheDocument();

    await waitFor(() => {
      expect(fetchDepartments).toHaveBeenCalledTimes(1);
    });

    fireEvent.click(screen.getByRole("button", { name: "新規作成" }));

    expect(screen.getByText("新規作成モーダル")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "閉じる" }));

    expect(screen.queryByText("新規作成モーダル")).not.toBeInTheDocument();
  });

  it("削除ダイアログを開いて削除完了後に再読込する", async () => {
    renderWithProviders(<DepartmentManagement />);

    fireEvent.click(screen.getByRole("button", { name: "削除対象を開く" }));

    expect(screen.getByText("部署を削除しますか？")).toBeInTheDocument();
    expect(screen.getByText("営業部")).toBeInTheDocument();
    expect(screen.getByText("SALES")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "削除する" }));

    await waitFor(() => {
      expect(deleteDepartment).toHaveBeenCalledWith("SALES");
      expect(fetchDepartments).toHaveBeenCalledTimes(2);
    });
  });
});
