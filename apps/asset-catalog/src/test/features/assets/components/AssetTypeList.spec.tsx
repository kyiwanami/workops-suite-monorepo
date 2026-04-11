import { fireEvent, screen, within, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AssetTypeList } from "../../../../features/assets/components/AssetTypeList";
import { renderWithProviders } from "../../../renderWithProviders";

type AssetTypeLike = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  sortOrder: number | null;
};

const state = vi.hoisted(() => ({
  assetTypes: [] as AssetTypeLike[],
  loading: false,
  deleteAssetType: vi.fn(),
  showError: vi.fn(),
  showSuccess: vi.fn(),
}));

vi.mock("../../../../features/assets/hooks/useAssetTypes", () => ({
  useAssetTypes: () => ({
    assetTypes: state.assetTypes,
    loading: state.loading,
  }),
}));

vi.mock("../../../../features/assets/hooks/useAssetType", () => ({
  useAssetType: () => ({
    deleteAssetType: state.deleteAssetType,
  }),
}));

vi.mock("@workops-suite/shared-notification", () => ({
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

vi.mock("../../../../features/assets/components/AssetTypeFormDialog", () => ({
  AssetTypeFormDialog: ({ open, id }: { open: boolean; id?: string | null }) =>
    open ? <div data-testid="asset-type-form-dialog">{id ?? "new"}</div> : null,
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
  state.assetTypes = [];
  state.loading = false;
  state.deleteAssetType.mockResolvedValue({ id: "type-1" });
});

describe("AssetTypeList", () => {
  it("読み込み中はメッセージを表示する", () => {
    state.loading = true;

    renderWithProviders(<AssetTypeList />);

    expect(screen.getByText("読み込み中...")).toBeInTheDocument();
  });

  it("一覧を絞り込んで編集を開ける", () => {
    state.assetTypes = [
      {
        id: "type-1",
        code: "LAPTOP",
        name: "ノートPC",
        description: "PC",
        sortOrder: 1,
      },
      {
        id: "type-2",
        code: "MONITOR",
        name: "モニター",
        description: "Display",
        sortOrder: 2,
      },
    ];

    renderWithProviders(<AssetTypeList />);

    expect(screen.getByText("LAPTOP")).toBeInTheDocument();
    expect(screen.getByText("MONITOR")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("コード"), {
      target: { value: "LAP" },
    });

    expect(screen.getByText("LAPTOP")).toBeInTheDocument();
    expect(screen.queryByText("MONITOR")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "新規登録" }));
    expect(screen.getByTestId("asset-type-form-dialog")).toHaveTextContent("new");

    const row = screen.getByText("LAPTOP").closest("tr");
    if (!row) {
      throw new Error("asset type row not found");
    }

    fireEvent.click(within(row).getAllByRole("button")[0]);
    expect(screen.getByTestId("asset-type-form-dialog")).toHaveTextContent("type-1");
  });

  it("削除ダイアログから削除できる", async () => {
    state.assetTypes = [
      {
        id: "type-1",
        code: "LAPTOP",
        name: "ノートPC",
        description: "PC",
        sortOrder: 1,
      },
    ];

    renderWithProviders(<AssetTypeList />);

    const row = screen.getByText("LAPTOP").closest("tr");
    if (!row) {
      throw new Error("asset type row not found");
    }

    fireEvent.click(within(row).getAllByRole("button")[1]);
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    fireEvent.click(screen.getByText("confirm"));

    await waitFor(() => {
      expect(state.deleteAssetType).toHaveBeenCalledWith("type-1");
    });
    expect(state.showSuccess).toHaveBeenCalledWith("資産種別を削除しました");
  });
});
