import { fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "../../renderWithProviders";
import { UserList } from "../../../features/user-management/components/UserList";
import type {
  CognitoUserType,
  UserDetailType,
} from "../../../features/user-management/types";

const useUserManagementMock = vi.hoisted(() => vi.fn());

vi.mock("../../../features/user-management/hooks/useUserManagement", () => ({
  useUserManagement: useUserManagementMock,
}));

vi.mock("../../../features/user-management/components/UserTable", () => ({
  UserTable: ({
    users,
    loading,
    onViewDetail,
  }: {
    users: CognitoUserType[];
    loading: boolean;
    onViewDetail: (username: string) => void;
  }) => (
    <div data-testid="user-table">
      <span>{loading ? "loading" : "ready"}</span>
      {users.map((user) => (
        <div key={user.username}>
          <span>{user.username}</span>
          <button type="button" onClick={() => onViewDetail(user.username)}>
            view-{user.username}
          </button>
        </div>
      ))}
    </div>
  ),
}));

vi.mock("../../../features/user-management/components/CreateUserModal", () => ({
  CreateUserModal: () => null,
}));

vi.mock("../../../features/user-management/components/UserDetailModal", () => ({
  UserDetailModal: ({
    open,
    user,
    onClose,
  }: {
    open: boolean;
    user: UserDetailType | null;
    onClose: (refresh?: boolean) => void;
  }) =>
    open ? (
      <div data-testid="user-detail-modal">
        <span>{user?.username}</span>
        <button type="button" onClick={() => onClose(true)}>
          close-detail
        </button>
      </div>
    ) : null,
}));

const users = [
  {
    username: "alice",
    email: "alice@example.com",
    status: "CONFIRMED",
    enabled: true,
    createdDate: "2025-01-01T00:00:00.000Z",
    lastModifiedDate: "2025-01-02T00:00:00.000Z",
  },
  {
    username: "bob",
    email: "bob@example.com",
    status: "UNCONFIRMED",
    enabled: false,
    createdDate: "2025-02-01T00:00:00.000Z",
    lastModifiedDate: "2025-02-02T00:00:00.000Z",
  },
] satisfies CognitoUserType[];

const aliceDetail = {
  username: "alice",
  status: "CONFIRMED",
  enabled: true,
  createdDate: "2025-01-01T00:00:00.000Z",
  lastModifiedDate: "2025-01-02T00:00:00.000Z",
  attributes: {},
} satisfies UserDetailType;

const buildHookValue = () => {
  const fetchUsers = vi.fn();
  const fetchUserDetail = vi.fn().mockResolvedValue(aliceDetail);

  return {
    users,
    loading: false,
    fetchUsers,
    fetchUserDetail,
    createUser: vi.fn(),
    setUserEnabled: vi.fn(),
    deleteUser: vi.fn(),
    fetchGroupsForUser: vi.fn(),
    fetchAllGroups: vi.fn(),
    assignUserGroup: vi.fn(),
  };
};

beforeEach(() => {
  vi.clearAllMocks();
  useUserManagementMock.mockReturnValue(buildHookValue());
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("UserList", () => {
  it("一覧を絞り込み、更新ボタンで再取得する", () => {
    const hookValue = buildHookValue();
    useUserManagementMock.mockReturnValue(hookValue);

    renderWithProviders(<UserList />);

    expect(hookValue.fetchUsers).toHaveBeenCalledTimes(1);
    expect(screen.getByText("alice")).toBeInTheDocument();
    expect(screen.getByText("bob")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("ユーザー名"), {
      target: { value: "ali" },
    });

    expect(screen.getByText("alice")).toBeInTheDocument();
    expect(screen.queryByText("bob")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "更新" }));
    expect(hookValue.fetchUsers).toHaveBeenCalledTimes(2);
  });

  it("詳細表示からモーダルを開き、閉じると再取得する", async () => {
    const hookValue = buildHookValue();
    useUserManagementMock.mockReturnValue(hookValue);

    renderWithProviders(<UserList />);

    fireEvent.click(screen.getByRole("button", { name: "view-alice" }));

    await waitFor(() => {
      expect(hookValue.fetchUserDetail).toHaveBeenCalledWith("alice");
    });

    expect(await screen.findByTestId("user-detail-modal")).toHaveTextContent("alice");

    fireEvent.click(screen.getByRole("button", { name: "close-detail" }));
    expect(hookValue.fetchUsers).toHaveBeenCalledTimes(2);
  });
});
