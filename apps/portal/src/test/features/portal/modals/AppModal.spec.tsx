import { fireEvent, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AppModal from "../../../../features/portal/components/modals/AppModal";
import type { AppDataType } from "../../../../features/portal/types/app";
import { renderWithProviders } from "../../../renderWithProviders";

const mockUseApps = vi.hoisted(() => ({
  apps: [] satisfies AppDataType[],
  createApp: vi.fn(),
  updateApp: vi.fn(),
  operationLoading: false,
  operationError: null as string | null,
}));

vi.mock("../../../../features/portal/hooks/useApps", () => ({
  useApps: () => mockUseApps,
}));

const editingApp: AppDataType = {
  appId: "app-1",
  name: "ポータル",
  description: "ポータルの説明",
  urlDomain: "https://portal.example.com",
  iconName: "Home",
  color: "#1976d2",
  pages: [],
};

beforeEach(() => {
  mockUseApps.apps = [];
  mockUseApps.operationLoading = false;
  mockUseApps.operationError = null;
  mockUseApps.createApp.mockReset();
  mockUseApps.updateApp.mockReset();
  mockUseApps.createApp.mockResolvedValue({
    appId: "portal",
    name: "業務ポータル",
    description: "",
    urlDomain: "https://portal.example.com",
    iconName: "Home",
    color: "#1976d2",
    pages: [],
  });
  mockUseApps.updateApp.mockResolvedValue({
    ...editingApp,
    description: "更新した説明",
  });
});

describe("AppModal", () => {
  it("新規作成の入力を createApp に渡す", async () => {
    const onClose = vi.fn();

    renderWithProviders(
      <AppModal open onClose={onClose} />
    );

    fireEvent.change(screen.getByRole("textbox", { name: "プロジェクト名" }), {
      target: { value: "業務ポータル" },
    });
    fireEvent.change(screen.getByRole("textbox", { name: "プロジェクトID" }), {
      target: { value: "portal" },
    });
    fireEvent.change(screen.getByRole("textbox", { name: "ドメインURL" }), {
      target: { value: "https://portal.example.com" },
    });
    fireEvent.change(screen.getByRole("textbox", { name: "アイコン名" }), {
      target: { value: "Home" },
    });
    fireEvent.change(screen.getByRole("textbox", { name: "カラーテーマ" }), {
      target: { value: "#1976d2" },
    });

    fireEvent.click(screen.getByRole("button", { name: "登録" }));

    await waitFor(() => {
      expect(mockUseApps.createApp).toHaveBeenCalledWith({
        appId: "portal",
        name: "業務ポータル",
        description: "",
        urlDomain: "https://portal.example.com",
        iconName: "Home",
        color: "#1976d2",
      });
    });
    expect(onClose).toHaveBeenCalled();
  });

  it("編集モードで初期値を復元して updateApp に渡す", async () => {
    const onClose = vi.fn();

    renderWithProviders(
      <AppModal
        open
        onClose={onClose}
        editingApp={editingApp}
      />
    );

    expect(screen.getByDisplayValue("app-1")).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "プロジェクト名" })).toHaveValue(
      "ポータル"
    );

    fireEvent.change(screen.getByRole("textbox", { name: "説明" }), {
      target: { value: "更新した説明" },
    });
    fireEvent.click(screen.getByRole("button", { name: "更新" }));

    await waitFor(() => {
      expect(mockUseApps.updateApp).toHaveBeenCalledWith({
        appId: "app-1",
        name: "ポータル",
        description: "更新した説明",
        urlDomain: "https://portal.example.com",
        iconName: "Home",
        color: "#1976d2",
      });
    });
    expect(onClose).toHaveBeenCalled();
  });
});
