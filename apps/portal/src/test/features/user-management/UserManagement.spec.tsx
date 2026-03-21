import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "../../../renderWithProviders";
import UserManagement from "../../../../features/user-management/UserManagement";

vi.mock("../../../../features/user-management/components/UserList", () => ({
  UserList: () => <div>ユーザー一覧モック</div>,
}));

describe("UserManagement", () => {
  it("UserList を包んで表示する", () => {
    renderWithProviders(<UserManagement />);

    expect(screen.getByText("ユーザー一覧モック")).toBeInTheDocument();
  });
});
