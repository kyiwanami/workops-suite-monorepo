import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import PageCard from "../../../../features/portal/components/PageCard";
import type { PageDataType } from "../../../../features/portal/types/app";

const basePage: PageDataType = {
  pageId: "page-1",
  appId: "app-1",
  name: "ホーム",
  description: "ポータルの入口ページ",
  relativePath: "home",
  iconName: "Home",
};

describe("PageCard", () => {
  it("ページ情報から外部リンクを生成する", () => {
    render(
      <PageCard
        page={basePage}
        appColor="#1976d2"
        appUrlDomain="https://example.com"
      />
    );

    // CardActionArea が外部リンクとして描画されることを確認する。
    const link = screen.getByRole("link", { name: /ホーム/ });

    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "https://example.com/home");
    expect(link).toHaveAttribute("target", "_blank");
    expect(screen.getByText("ポータルの入口ページ")).toBeInTheDocument();
  });

  it("編集と削除のハンドラーに対象ページを渡す", () => {
    const onEdit = vi.fn<(page: PageDataType) => void>();
    const onDelete = vi.fn<
      (pageId: string, appId: string, pageName: string) => void
    >();

    render(
      <PageCard
        page={basePage}
        appColor="#1976d2"
        appUrlDomain="https://example.com"
        onEdit={onEdit}
        onDelete={onDelete}
      />
    );

    fireEvent.click(screen.getByLabelText("edit page"));
    fireEvent.click(screen.getByLabelText("delete page"));

    expect(onEdit).toHaveBeenCalledWith(basePage);
    expect(onDelete).toHaveBeenCalledWith("page-1", "app-1", "ホーム");
  });
});
