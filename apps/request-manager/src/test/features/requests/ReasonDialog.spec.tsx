import { fireEvent, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "../../renderWithProviders";
import { ReasonDialog } from "../../../features/requests/components/ReasonDialog";

describe("ReasonDialog", () => {
  it("入力した理由を確定コールバックに渡す", async () => {
    const onClose = vi.fn();
    const onConfirm = vi.fn();

    renderWithProviders(
      <ReasonDialog
        open
        title="申請を差戻しますか？"
        onClose={onClose}
        onConfirm={onConfirm}
      />
    );

    fireEvent.change(screen.getByLabelText("理由"), {
      target: { value: "記載内容を修正してください" },
    });
    fireEvent.click(screen.getByRole("button", { name: "確認" }));

    await waitFor(() => {
      expect(onConfirm).toHaveBeenCalledWith("記載内容を修正してください");
      expect(onClose).not.toHaveBeenCalled();
    });
  });

  it("キャンセルで閉じる", () => {
    const onClose = vi.fn();
    const onConfirm = vi.fn();

    renderWithProviders(
      <ReasonDialog
        open
        title="申請を差戻しますか？"
        onClose={onClose}
        onConfirm={onConfirm}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "キャンセル" }));

    expect(onClose).toHaveBeenCalled();
    expect(onConfirm).not.toHaveBeenCalled();
  });
});
