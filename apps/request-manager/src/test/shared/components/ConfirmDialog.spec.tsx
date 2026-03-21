import { fireEvent, render, screen } from "@testing-library/react";
import { ConfirmDialog } from "../../../shared/components/ConfirmDialog";
import { describe, expect, it, vi } from "vitest";

describe("ConfirmDialog", () => {
  it("confirm と cancel の callback を呼ぶ", () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();

    render(
      <ConfirmDialog
        open
        title="申請を削除しますか？"
        message="この操作は取り消せません。"
        onConfirm={onConfirm}
        onCancel={onCancel}
      />
    );

    expect(
      screen.getByRole("heading", { name: "申請を削除しますか？" })
    ).toBeInTheDocument();
    expect(screen.getByText("この操作は取り消せません。")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "キャンセル" }));
    fireEvent.click(screen.getByRole("button", { name: "削除" }));

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("loading 中は操作を無効化しスピナーを出す", () => {
    render(
      <ConfirmDialog
        open
        title="申請を削除しますか？"
        message="この操作は取り消せません。"
        onConfirm={() => {}}
        onCancel={() => {}}
        loading
      />
    );

    expect(screen.getByRole("button", { name: "キャンセル" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "削除" })).toBeDisabled();
    expect(screen.getByRole("progressbar")).toBeInTheDocument();
  });
});
