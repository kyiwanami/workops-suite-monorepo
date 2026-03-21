import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "../../renderWithProviders";
import { UserTable } from "../../../features/user-management/components/UserTable";
import type { CognitoUserType } from "../../../features/user-management/types";

const sampleUser: CognitoUserType = {
  username: "taro",
  email: "taro@example.com",
  status: "CONFIRMED",
  enabled: true,
  createdDate: "2024-01-01T00:00:00Z",
};

describe("UserTable", () => {
  it("読み込み中はスピナーを表示する", () => {
    renderWithProviders(
      <UserTable users={[]} loading={true} onViewDetail={vi.fn()} />
    );

    expect(screen.getByRole("progressbar")).toBeInTheDocument();
  });

  it("ユーザーがないときは空状態を表示する", () => {
    renderWithProviders(
      <UserTable users={[]} loading={false} onViewDetail={vi.fn()} />
    );

    expect(screen.getByText("ユーザーが見つかりません")).toBeInTheDocument();
  });

  it("ユーザー行を表示し、詳細表示を呼び出す", () => {
    const onViewDetail = vi.fn();

    renderWithProviders(
      <UserTable users={[sampleUser]} loading={false} onViewDetail={onViewDetail} />
    );

    expect(screen.getByText("taro")).toBeInTheDocument();
    expect(screen.getByText("taro@example.com")).toBeInTheDocument();
    expect(screen.getByText("確認済み")).toBeInTheDocument();
    expect(screen.getByText("有効")).toBeInTheDocument();

    fireEvent.click(screen.getByTitle("詳細表示"));

    expect(onViewDetail).toHaveBeenCalledWith("taro");
  });
});
