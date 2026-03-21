import { fireEvent, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "../../../renderWithProviders";
import { CreateUserModal } from "../../../../features/user-management/components/CreateUserModal";

const { createUser } = vi.hoisted(() => ({
  createUser: vi.fn(async () => true),
}));

vi.mock("../../../../features/user-management/hooks/useUserManagement", () => ({
  useUserManagement: () => ({
    createUser,
  }),
}));

describe("CreateUserModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("開いたときに初期表示され、キャンセルで閉じる", () => {
    const onClose = vi.fn();

    renderWithProviders(<CreateUserModal open={true} onClose={onClose} />);

    expect(screen.getByText("新規ユーザー作成")).toBeInTheDocument();
    expect(
      screen.getByText(
        "ユーザー作成後、登録したメールアドレスに一時パスワードが記載された招待メールが自動送信されます。"
      )
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "キャンセル" }));

    expect(onClose).toHaveBeenCalledWith(false);
  });

  it("入力内容を送信して成功時に閉じる", async () => {
    const onClose = vi.fn();

    renderWithProviders(<CreateUserModal open={true} onClose={onClose} />);

    fireEvent.change(screen.getByLabelText("ユーザー名"), {
      target: { value: "taro.yamada" },
    });
    fireEvent.change(screen.getByLabelText("メールアドレス"), {
      target: { value: "taro@example.com" },
    });

    fireEvent.click(screen.getByRole("button", { name: "ユーザーを作成" }));

    await waitFor(() => {
      expect(createUser).toHaveBeenCalledWith({
        username: "taro.yamada",
        email: "taro@example.com",
      });
      expect(onClose).toHaveBeenCalledWith(true);
    });
  });
});
