import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "../../renderWithProviders";
import { UserDetailModal } from "../../../features/user-management/components/UserDetailModal";
import type {
  CognitoGroupType,
  UserDetailType,
} from "../../../features/user-management/types";

const useUserManagementMock = vi.hoisted(() => vi.fn());

vi.mock("../../../features/user-management/hooks/useUserManagement", () => ({
  useUserManagement: useUserManagementMock,
}));

const currentGroups = [
  {
    groupName: "DEPT01_viewer",
    description: "viewer",
    creationDate: "2025-01-01T00:00:00.000Z",
    lastModifiedDate: "2025-01-02T00:00:00.000Z",
  },
] satisfies CognitoGroupType[];

const allGroups = [
  {
    groupName: "DEPT01_viewer",
    description: "viewer",
    creationDate: "2025-01-01T00:00:00.000Z",
    lastModifiedDate: "2025-01-02T00:00:00.000Z",
  },
  {
    groupName: "DEPT02_manager",
    description: "manager",
    creationDate: "2025-02-01T00:00:00.000Z",
    lastModifiedDate: "2025-02-02T00:00:00.000Z",
  },
] satisfies CognitoGroupType[];

const enabledUser = {
  username: "alice",
  status: "CONFIRMED",
  enabled: true,
  createdDate: "2025-01-01T00:00:00.000Z",
  lastModifiedDate: "2025-01-02T00:00:00.000Z",
  attributes: {},
} satisfies UserDetailType;

const disabledUser = {
  ...enabledUser,
  enabled: false,
} satisfies UserDetailType;

const buildHookValue = () => {
  const setUserEnabled = vi.fn().mockResolvedValue(true);
  const deleteUser = vi.fn().mockResolvedValue(true);
  const fetchGroupsForUser = vi.fn().mockResolvedValue(currentGroups);
  const fetchAllGroups = vi.fn().mockResolvedValue(allGroups);
  const assignUserGroup = vi.fn().mockResolvedValue(true);

  return {
    users: [],
    loading: false,
    fetchUsers: vi.fn(),
    fetchUserDetail: vi.fn(),
    createUser: vi.fn(),
    setUserEnabled,
    deleteUser,
    fetchGroupsForUser,
    fetchAllGroups,
    assignUserGroup,
  };
};

beforeEach(() => {
  vi.clearAllMocks();
  useUserManagementMock.mockReturnValue(buildHookValue());
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("UserDetailModal", () => {
  it("グループ情報と基本情報を表示する", async () => {
    const hookValue = buildHookValue();
    useUserManagementMock.mockReturnValue(hookValue);
    const onClose = vi.fn();

    renderWithProviders(
      <UserDetailModal open user={enabledUser} onClose={onClose} />
    );

    await waitFor(() => {
    expect(hookValue.fetchGroupsForUser).toHaveBeenCalledWith("alice");
    expect(hookValue.fetchAllGroups).toHaveBeenCalled();
    });

    expect(screen.getByText("ユーザー詳細")).toBeInTheDocument();
    expect(screen.getByText("alice")).toBeInTheDocument();
    const currentGroupLabel = screen.getByText("現在のグループ:");
    const currentGroupSection = currentGroupLabel.parentElement?.parentElement;
    expect(currentGroupSection).not.toBeNull();
    if (currentGroupSection) {
      expect(
        within(currentGroupSection).getByText("DEPT01_viewer")
      ).toBeInTheDocument();
    }
  });

  it("無効化確認から更新処理を呼び出す", async () => {
    const hookValue = buildHookValue();
    useUserManagementMock.mockReturnValue(hookValue);
    const onClose = vi.fn();

    renderWithProviders(
      <UserDetailModal open user={enabledUser} onClose={onClose} />
    );

    await waitFor(() => {
      expect(hookValue.fetchGroupsForUser).toHaveBeenCalled();
    });

    fireEvent.click(screen.getByRole("button", { name: "アカウントを無効にする" }));
    fireEvent.click(screen.getByRole("button", { name: "無効にする" }));

    await waitFor(() => {
      expect(hookValue.setUserEnabled).toHaveBeenCalledWith({
        username: "alice",
        enabled: false,
      });
      expect(onClose).toHaveBeenCalledWith(true);
    });
  });

  it("削除確認から削除処理を呼び出す", async () => {
    const hookValue = buildHookValue();
    useUserManagementMock.mockReturnValue(hookValue);
    const onClose = vi.fn();

    renderWithProviders(
      <UserDetailModal open user={disabledUser} onClose={onClose} />
    );

    await waitFor(() => {
      expect(hookValue.fetchGroupsForUser).toHaveBeenCalled();
    });

    fireEvent.click(screen.getByRole("button", { name: "削除" }));
    fireEvent.click(screen.getByRole("button", { name: "削除する" }));

    await waitFor(() => {
      expect(hookValue.deleteUser).toHaveBeenCalledWith({ username: "alice" });
      expect(onClose).toHaveBeenCalledWith(true);
    });
  });
});
