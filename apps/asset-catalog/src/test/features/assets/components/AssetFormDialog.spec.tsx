import { fireEvent, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AssetFormDialog } from "../../../../features/assets/components/AssetFormDialog";
import { renderWithProviders } from "../../../renderWithProviders";

type AssetLike = {
  departmentId: string;
  name: string;
  assetTypeId: string;
  status: "inStock" | "lent" | "inRepair" | "disposed";
  assigneeSub: string | null;
};

type AssetTypeLike = {
  id: string;
  name: string;
};

type DepartmentLike = {
  code: string;
  name: string;
};

type UserLike = {
  username: string;
  email?: string | null;
};

const state = vi.hoisted(() => ({
  getAsset: vi.fn(),
  createAsset: vi.fn(),
  updateAsset: vi.fn(),
  showError: vi.fn(),
  showSuccess: vi.fn(),
  assetTypes: [] as AssetTypeLike[],
  departments: [] as DepartmentLike[],
  listUsers: vi.fn(),
}));

vi.mock("aws-amplify/data", () => ({
  generateClient: () => ({
    queries: {
      listUsers: state.listUsers,
    },
  }),
}));

vi.mock("../../../../features/assets/hooks/useAssets", () => ({
  useAsset: () => ({
    getAsset: state.getAsset,
    createAsset: state.createAsset,
    updateAsset: state.updateAsset,
  }),
}));

vi.mock("../../../../features/assets/hooks/useAssetTypes", () => ({
  useAssetTypes: () => ({
    assetTypes: state.assetTypes,
    loading: false,
  }),
}));

vi.mock("../../../../features/assets/hooks/useDepartments", () => ({
  useDepartments: () => ({
    departments: state.departments,
    loading: false,
  }),
}));

vi.mock("@workops-suite/shared-notification", () => ({
  useNotification: () => ({
    showError: state.showError,
    showSuccess: state.showSuccess,
  }),
}));

vi.mock("@workops-suite/shared-auth", () => ({
  useAuth: () => ({
    userInfo: {
      departmentCode: "DEP-1",
    },
  }),
}));

vi.mock("@casl/react", () => ({
  useAbility: () => ({
    can: () => true,
  }),
}));

vi.mock("../../../../shared/auth/ability", () => ({
  AbilityContext: {},
  Can: ({ children }: { children?: ReactNode | ((allowed: boolean) => ReactNode) }) => {
    if (typeof children === "function") {
      return <>{children(true)}</>;
    }

    return <>{children}</>;
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
  state.getAsset.mockResolvedValue(null);
  state.createAsset.mockResolvedValue({ id: "asset-1" });
  state.updateAsset.mockResolvedValue({ id: "asset-1" });
  state.assetTypes = [{ id: "type-1", name: "ノートPC" }];
  state.departments = [{ code: "DEP-1", name: "情報システム部" }];
  state.listUsers.mockResolvedValue({
    data: [{ username: "user-1", email: "user-1@example.com" } satisfies UserLike],
    errors: undefined,
  });
});

describe("AssetFormDialog", () => {
  it("新規登録で資産を作成する", async () => {
    const onClose = vi.fn();

    renderWithProviders(
      <AssetFormDialog open={true} onClose={onClose} />
    );

    expect(screen.getByText("資産登録")).toBeInTheDocument();

    fireEvent.change(screen.getByRole("textbox", { name: "名称" }), {
      target: { value: "ノートPC" },
    });

    fireEvent.mouseDown(screen.getByRole("combobox", { name: /資産種別/ }));
    fireEvent.click(await screen.findByRole("option", { name: "ノートPC" }));

    fireEvent.click(screen.getByRole("button", { name: "登録" }));

    await waitFor(() => {
      expect(state.createAsset).toHaveBeenCalledWith(
        expect.objectContaining({
          departmentId: "DEP-1",
          name: "ノートPC",
          assetTypeId: "type-1",
          status: "inStock",
          assigneeSub: null,
        })
      );
    });
    expect(state.showSuccess).toHaveBeenCalledWith("資産を登録しました");
    expect(onClose).toHaveBeenCalled();
  });

  it("編集で資産を更新する", async () => {
    const onClose = vi.fn();

    state.getAsset.mockResolvedValue({
      departmentId: "DEP-1",
      name: "既存資産",
      assetTypeId: "type-1",
      status: "lent",
      assigneeSub: "user-1",
    } satisfies AssetLike);

    renderWithProviders(
      <AssetFormDialog open={true} onClose={onClose} id="asset-1" />
    );

    await screen.findByDisplayValue("既存資産");

    fireEvent.click(screen.getByRole("button", { name: "更新" }));

    await waitFor(() => {
      expect(state.updateAsset).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "asset-1",
          departmentId: "DEP-1",
          name: "既存資産",
          assetTypeId: "type-1",
          status: "lent",
          assigneeSub: "user-1",
        })
      );
    });
    expect(state.showSuccess).toHaveBeenCalledWith("資産を更新しました");
    expect(onClose).toHaveBeenCalled();
  });
});
