import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "../../renderWithProviders";
import { DepartmentTable } from "../../../features/department-management/components/DepartmentTable";
import type { DepartmentType } from "../../../features/department-management/types";

const sampleDepartment: DepartmentType = {
  code: "SALES",
  name: "営業部",
  sortOrder: 1,
  notes: "北日本",
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-01-02T00:00:00Z",
};

describe("DepartmentTable", () => {
  it("読み込み中はスピナーを表示する", () => {
    renderWithProviders(
      <DepartmentTable
        departments={[]}
        loading={true}
        onDeleteRequest={vi.fn()}
        canDelete={false}
      />
    );

    expect(screen.getByRole("progressbar")).toBeInTheDocument();
  });

  it("部署がないときは空状態を表示する", () => {
    renderWithProviders(
      <DepartmentTable
        departments={[]}
        loading={false}
        onDeleteRequest={vi.fn()}
        canDelete={false}
      />
    );

    expect(screen.getByText("部署が登録されていません")).toBeInTheDocument();
  });

  it("部署行を表示し、削除操作を呼び出す", () => {
    const onDeleteRequest = vi.fn();

    renderWithProviders(
      <DepartmentTable
        departments={[sampleDepartment]}
        loading={false}
        onDeleteRequest={onDeleteRequest}
        canDelete={true}
      />
    );

    expect(screen.getByText("SALES")).toBeInTheDocument();
    expect(screen.getByText("営業部")).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("北日本")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button"));

    expect(onDeleteRequest).toHaveBeenCalledWith(sampleDepartment);
  });
});
