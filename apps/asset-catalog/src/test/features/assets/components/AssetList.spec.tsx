import { fireEvent, screen, within, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AssetList } from "../../../../features/assets/components/AssetList";
import { renderWithProviders } from "../../../renderWithProviders";

type AssetLike = {
  id: string;
  name: string;
  departmentId: string;
  assigneeSub: string | null;
  status: "inStock" | "lent" | "inRepair" | "disposed";
  assetTypeId: string;
  createdAt?: string | null;
};

type AssetTypeLike = {
  id: string;
  name: string;
};

const state = vi.hoisted(() => ({
  navigate: vi.fn(),
  assets: [] as AssetLike[],
  assetTypes: [] as AssetTypeLike[],
  loading: false,
  deleteAsset: vi.fn(),
  showError: vi.fn(),
  showSuccess: vi.fn(),
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>(
    "react-router-dom"
  );

  return {
    ...actual,
    useNavigate: () => state.navigate,
  };
});

vi.mock("../../../../features/assets/hooks/useAssets", () => ({
  useAssets: () => ({
    assets: state.assets,
    loading: state.loading,
  }),
  useAsset: () => ({
    deleteAsset: state.deleteAsset,
  }),
}));

vi.mock("../../../../features/assets/hooks/useAssetTypes", () => ({
  useAssetTypes: () => ({
    assetTypes: state.assetTypes,
    loading: false,
  }),
}));

vi.mock("../../../../shared/notification", () => ({
  useNotification: () => ({
    showError: state.showError,
    showSuccess: state.showSuccess,
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

vi.mock("../../../../features/assets/components/AssetFormDialog", () => ({
  AssetFormDialog: ({ open, id }: { open: boolean; id?: string | null }) =>
    open ? <div data-testid="asset-form-dialog">{id ?? "new"}</div> : null,
}));

vi.mock("../../../../shared/components/ConfirmDialog", () => ({
  ConfirmDialog: ({
    open,
    title,
    onConfirm,
    onCancel,
  }: {
    open: boolean;
    title: string;
    onConfirm: () => void;
    onCancel: () => void;
  }) =>
    open ? (
      <div role="dialog">
        <span>{title}</span>
        <button onClick={onConfirm}>confirm</button>
        <button onClick={onCancel}>cancel</button>
      </div>
    ) : null,
}));

beforeEach(() => {
  vi.clearAllMocks();
  state.assets = [];
  state.assetTypes = [];
  state.loading = false;
  state.deleteAsset.mockResolvedValue({ id: "asset-1" });
});

describe("AssetList", () => {
  it("読み込み中はメッセージを表示する", () => {
    state.loading = true;

    renderWithProviders(<AssetList />);

    expect(screen.getByText("読み込み中...")).toBeInTheDocument();
  });

  it("一覧を表示してフィルタと編集を扱える", () => {
    state.assets = [
      {
        id: "asset-1",
        name: "ノートPC",
        departmentId: "DEP-1",
        assigneeSub: "user-1",
        status: "inStock",
        assetTypeId: "type-1",
        createdAt: "2025-03-01T00:00:00.000Z",
      },
      {
        id: "asset-2",
        name: "モニター",
        departmentId: "DEP-2",
        assigneeSub: null,
        status: "lent",
        assetTypeId: "type-2",
        createdAt: "2025-03-02T00:00:00.000Z",
      },
    ];
    state.assetTypes = [
      { id: "type-1", name: "ノートPC" },
      { id: "type-2", name: "周辺機器" },
    ];

    renderWithProviders(<AssetList />);

    const table = screen.getByRole("table");
    const initialRows = within(table)
      .getAllByRole("row")
      .filter((row) => within(row).queryByRole("button", { name: "編集" }));
    const firstAssetRow = initialRows.find((row) => within(row).queryByText("DEP-2"));
    const secondAssetRow = initialRows.find((row) => within(row).queryByText("DEP-1"));
    if (!firstAssetRow || !secondAssetRow) {
      throw new Error("asset row not found");
    }
    expect(firstAssetRow).toHaveTextContent("モニター");
    expect(secondAssetRow).toHaveTextContent("ノートPC");

    fireEvent.change(screen.getByLabelText("名称"), {
      target: { value: "ノート" },
    });

    const filteredRows = within(table)
      .getAllByRole("row")
      .filter((row) => within(row).queryByRole("button", { name: "編集" }));
    const filteredAssetRow = filteredRows.find((row) => within(row).queryByText("DEP-1"));
    if (!filteredAssetRow) {
      throw new Error("filtered asset row not found");
    }
    expect(filteredRows).toHaveLength(1);
    expect(filteredAssetRow).toHaveTextContent("ノートPC");

    fireEvent.click(screen.getByRole("button", { name: "新規登録" }));
    expect(screen.getByTestId("asset-form-dialog")).toHaveTextContent("new");

    fireEvent.click(within(filteredAssetRow).getByRole("button", { name: "編集" }));
    expect(screen.getByTestId("asset-form-dialog")).toHaveTextContent("asset-1");
  });

  it("削除ダイアログから削除できる", async () => {
    state.assets = [
      {
        id: "asset-1",
        name: "ノートPC",
        departmentId: "DEP-1",
        assigneeSub: null,
        status: "inStock",
        assetTypeId: "type-1",
        createdAt: "2025-03-01T00:00:00.000Z",
      },
    ];
    state.assetTypes = [{ id: "type-1", name: "ノートPC" }];

    renderWithProviders(<AssetList />);

    const row = within(screen.getByRole("table"))
      .getAllByRole("row")
      .filter((candidate) => within(candidate).queryByRole("button", { name: "削除" }))
      .find((candidate) => within(candidate).queryByText("DEP-1"));
    if (!row) {
      throw new Error("asset row not found");
    }

    fireEvent.click(within(row).getByRole("button", { name: "削除" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    fireEvent.click(screen.getByText("confirm"));

    await waitFor(() => {
      expect(state.deleteAsset).toHaveBeenCalledWith("asset-1");
    });
    expect(state.showSuccess).toHaveBeenCalledWith("資産を削除しました");
  });
});
