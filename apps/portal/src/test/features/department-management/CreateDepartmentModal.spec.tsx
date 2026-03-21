import { fireEvent, screen, waitFor } from "@testing-library/react";
import { beforeEach, vi, describe, expect, it } from "vitest";
import { renderWithProviders } from "../../renderWithProviders";
import { CreateDepartmentModal } from "../../../features/department-management/components/CreateDepartmentModal";

const { createDepartment } = vi.hoisted(() => ({
  createDepartment: vi.fn(async () => true),
}));

vi.mock(
  "../../../features/department-management/hooks/useDepartmentManagement",
  () => ({
    useDepartmentManagement: () => ({
      createDepartment,
    }),
  })
);

describe("CreateDepartmentModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("開いたときに初期表示され、キャンセルで閉じる", () => {
    const onClose = vi.fn();

    renderWithProviders(
      <CreateDepartmentModal open={true} onClose={onClose} />
    );

    expect(screen.getByText("新規部署を作成")).toBeInTheDocument();
    expect(screen.getByText("部署コードは作成後に変更できません。慎重に設定してください。")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "キャンセル" }));

    expect(onClose).toHaveBeenCalledWith(false);
  });

  it("入力内容を送信して成功時に閉じる", async () => {
    const onClose = vi.fn();

    renderWithProviders(
      <CreateDepartmentModal open={true} onClose={onClose} />
    );

    fireEvent.change(screen.getByRole("textbox", { name: /部署コード/ }), {
      target: { value: "sales" },
    });
    fireEvent.change(screen.getByRole("textbox", { name: /部署名/ }), {
      target: { value: "営業部" },
    });
    fireEvent.change(screen.getByRole("textbox", { name: /備考/ }), {
      target: { value: "運用メモ" },
    });

    fireEvent.click(screen.getByRole("button", { name: "作成する" }));

    await waitFor(() => {
      expect(createDepartment).toHaveBeenCalledWith({
        code: "SALES",
        name: "営業部",
        sortOrder: undefined,
        notes: "運用メモ",
      });
      expect(onClose).toHaveBeenCalledWith(true);
    });
  });
});
