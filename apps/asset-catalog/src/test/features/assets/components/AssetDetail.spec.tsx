import { fireEvent, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AssetDetail } from "../../../../features/assets/components/AssetDetail";
import { renderWithProviders } from "../../../renderWithProviders";

type AssetLike = {
  id: string;
  name: string;
  departmentId: string;
  assigneeSub: string | null;
  status: "inStock" | "lent" | "inRepair" | "disposed";
  assetTypeId: string;
  createdAt?: string | null;
  updatedAt?: string | null;
};

type AssetTypeLike = {
  id: string;
  name: string;
};

const state = vi.hoisted(() => ({
  navigate: vi.fn(),
  params: { id: "asset-1" },
  showError: vi.fn(),
  showSuccess: vi.fn(),
  deleteAsset: vi.fn(),
  asset: null as AssetLike | null,
  loading: false,
  assetTypes: [] as AssetTypeLike[],
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>(
    "react-router-dom"
  );

  return {
    ...actual,
    useNavigate: () => state.navigate,
    useParams: () => state.params,
  };
});

vi.mock("../../../../features/assets/hooks/useAssets", () => ({
  useAsset: () => ({
    asset: state.asset,
    loading: state.loading,
    deleteAsset: state.deleteAsset,
  }),
}));

vi.mock("../../../../features/assets/hooks/useAssetTypes", () => ({
  useAssetTypes: () => ({
    assetTypes: state.assetTypes,
    loading: false,
  }),
}));

vi.mock("@workops-suite/shared-notification", () => ({
  useNotification: () => ({
    showError: state.showError,
    showSuccess: state.showSuccess,
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
  state.asset = null;
  state.loading = false;
  state.assetTypes = [];
  state.params = { id: "asset-1" };
  state.deleteAsset.mockResolvedValue(true);
});

describe("AssetDetail", () => {
  it("読み込み中はスピナーを表示する", () => {
    state.loading = true;

    renderWithProviders(<AssetDetail />);

    expect(screen.getByRole("progressbar")).toBeInTheDocument();
  });

  it("データがなければ一覧へ戻れる", () => {
    renderWithProviders(<AssetDetail />);

    expect(screen.getByText("データが見つかりません")).toBeInTheDocument();

    fireEvent.click(screen.getByText("資産一覧に戻る"));

    expect(state.navigate).toHaveBeenCalledWith("/assets");
  });

  it("編集を開けて削除を確定できる", async () => {
    state.asset = {
      id: "asset-1",
      name: "ノートPC",
      departmentId: "DEP-1",
      assigneeSub: "user-1",
      status: "lent",
      assetTypeId: "type-1",
      createdAt: "2025-03-01T00:00:00.000Z",
      updatedAt: "2025-03-02T00:00:00.000Z",
    };
    state.assetTypes = [{ id: "type-1", name: "ノートPC" }];

    renderWithProviders(<AssetDetail />);

    expect(
      screen.getByRole("heading", { name: "資産詳細", level: 5 })
    ).toBeInTheDocument();

    const assetTypeLabel = screen.getByText("資産種別");
    const assetTypeValue = assetTypeLabel.nextElementSibling;
    if (!assetTypeValue) {
      throw new Error("asset type value not found");
    }
    expect(assetTypeValue).toHaveTextContent("ノートPC");

    fireEvent.click(screen.getByRole("button", { name: "編集" }));
    expect(screen.getByTestId("asset-form-dialog")).toHaveTextContent("asset-1");

    fireEvent.click(screen.getByRole("button", { name: "削除" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    fireEvent.click(screen.getByText("confirm"));

    await waitFor(() => {
      expect(state.deleteAsset).toHaveBeenCalledWith("asset-1");
    });
    expect(state.showSuccess).toHaveBeenCalledWith("資産を削除しました");
    expect(state.navigate).toHaveBeenCalledWith("/assets");
  });
});
