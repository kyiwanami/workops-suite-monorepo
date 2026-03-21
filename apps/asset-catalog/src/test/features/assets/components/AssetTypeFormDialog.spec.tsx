import { fireEvent, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AssetTypeFormDialog } from "../../../../features/assets/components/AssetTypeFormDialog";
import { renderWithProviders } from "../../../renderWithProviders";

type AssetTypeLike = {
  code: string;
  name: string;
  description: string;
  sortOrder: number | undefined;
};

const state = vi.hoisted(() => ({
  getAssetType: vi.fn(),
  createAssetType: vi.fn(),
  updateAssetType: vi.fn(),
  showError: vi.fn(),
  showSuccess: vi.fn(),
}));

vi.mock("../../../../features/assets/hooks/useAssetType", () => ({
  useAssetType: () => ({
    getAssetType: state.getAssetType,
    createAssetType: state.createAssetType,
    updateAssetType: state.updateAssetType,
  }),
}));

vi.mock("../../../../shared/notification", () => ({
  useNotification: () => ({
    showError: state.showError,
    showSuccess: state.showSuccess,
  }),
}));

beforeEach(() => {
  vi.clearAllMocks();
  state.getAssetType.mockResolvedValue(null);
  state.createAssetType.mockResolvedValue({ id: "type-1" });
  state.updateAssetType.mockResolvedValue({ id: "type-1" });
});

describe("AssetTypeFormDialog", () => {
  it("新規登録で資産種別を作成する", async () => {
    const onClose = vi.fn();

    renderWithProviders(
      <AssetTypeFormDialog open={true} onClose={onClose} />
    );

    expect(screen.getByText("資産種別登録")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("コード"), {
      target: { value: "LAPTOP" },
    });
    fireEvent.change(screen.getByLabelText("名称"), {
      target: { value: "ノートPC" },
    });

    fireEvent.click(screen.getByRole("button", { name: "登録" }));

    await waitFor(() => {
      expect(state.createAssetType).toHaveBeenCalledWith(
        expect.objectContaining({
          code: "LAPTOP",
          name: "ノートPC",
        })
      );
    });
    expect(state.showSuccess).toHaveBeenCalledWith("資産種別を登録しました");
    expect(onClose).toHaveBeenCalled();
  });

  it("編集で資産種別を更新する", async () => {
    const onClose = vi.fn();

    state.getAssetType.mockResolvedValue({
      code: "LAPTOP",
      name: "ノートPC",
      description: "説明",
      sortOrder: 10,
    } satisfies AssetTypeLike);

    renderWithProviders(
      <AssetTypeFormDialog open={true} onClose={onClose} id="type-1" />
    );

    await screen.findByDisplayValue("ノートPC");

    fireEvent.click(screen.getByRole("button", { name: "更新" }));

    await waitFor(() => {
      expect(state.updateAssetType).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "type-1",
          name: "ノートPC",
          description: "説明",
          sortOrder: 10,
        })
      );
    });
    expect(state.showSuccess).toHaveBeenCalledWith("資産種別を更新しました");
    expect(onClose).toHaveBeenCalled();
  });
});
