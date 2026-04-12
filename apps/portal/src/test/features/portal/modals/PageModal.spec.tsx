import { fireEvent, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import PageModal from "../../../../features/portal/components/modals/PageModal";
import type { PageDataType, AppDataType } from "../../../../features/portal/types/app";
import { renderWithProviders } from "../../../renderWithProviders";

const selectedApp: AppDataType = {
  appId: "app-1",
  name: "ポータル",
  description: "ポータルの説明",
  urlDomain: "https://portal.example.com",
  iconName: "Home",
  color: "#1976d2",
  pages: [],
};

const editingPage: PageDataType = {
  pageId: "page-1",
  appId: "app-1",
  name: "トップ",
  description: "トップページ",
  relativePath: "top",
  iconName: "Home",
};

describe("PageModal", () => {
  it("新規作成の入力を submit callback に渡す", async () => {
    const onClose = vi.fn();
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    renderWithProviders(
      <PageModal
        open
        onClose={onClose}
        onSubmit={onSubmit}
        selectedApp={selectedApp}
      />
    );

    fireEvent.change(screen.getByRole("textbox", { name: "ページ名" }), {
      target: { value: "会社概要" },
    });
    fireEvent.change(screen.getByRole("textbox", { name: "ページID" }), {
      target: { value: "company" },
    });
    fireEvent.change(screen.getByRole("textbox", { name: "説明" }), {
      target: { value: "会社情報" },
    });
    fireEvent.change(screen.getByRole("textbox", { name: "相対パス" }), {
      target: { value: "about" },
    });
    fireEvent.change(screen.getByRole("textbox", { name: "アイコン名" }), {
      target: { value: "Home" },
    });

    fireEvent.click(screen.getByRole("button", { name: "登録" }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        pageId: "company",
        appId: "app-1",
        name: "会社概要",
        description: "会社情報",
        relativePath: "about",
        iconName: "Home",
      });
    });
    expect(onClose).toHaveBeenCalled();
  });

  it("キャンセルで閉じる", () => {
    const onClose = vi.fn();
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    renderWithProviders(
      <PageModal
        open
        onClose={onClose}
        onSubmit={onSubmit}
        selectedApp={selectedApp}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "キャンセル" }));

    expect(onClose).toHaveBeenCalled();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("編集モードで初期値を復元して更新する", async () => {
    const onClose = vi.fn();
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    renderWithProviders(
      <PageModal
        open
        onClose={onClose}
        onSubmit={onSubmit}
        selectedApp={selectedApp}
        editingPage={editingPage}
      />
    );

    expect(screen.getByDisplayValue("page-1")).toBeInTheDocument();
    expect(screen.getByDisplayValue("トップ")).toBeInTheDocument();

    fireEvent.change(screen.getByRole("textbox", { name: "説明" }), {
      target: { value: "更新した説明" },
    });
    fireEvent.click(screen.getByRole("button", { name: "更新" }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        pageId: "page-1",
        appId: "app-1",
        name: "トップ",
        description: "更新した説明",
        relativePath: "top",
        iconName: "Home",
      });
    });
    expect(onClose).toHaveBeenCalled();
  });
});
