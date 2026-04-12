import { fireEvent, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import AppCard from "../../../../features/portal/components/AppCard";
import type { AppDataType } from "../../../../features/portal/types/app";
import { renderWithProviders } from "../../../renderWithProviders";

const baseApp: AppDataType = {
  appId: "app-1",
  name: "ポータル",
  description: "ポータルの説明",
  urlDomain: "https://portal.example.com",
  iconName: "Home",
  color: "#1976d2",
  pages: [
    {
      pageId: "page-1",
      appId: "app-1",
      name: "Home",
      description: "トップページ",
      relativePath: "home",
      iconName: "Home",
    },
  ],
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe("AppCard", () => {
  it("主要情報を描画してカードクリックを通知する", () => {
    const onClick = vi.fn();

    renderWithProviders(
      <AppCard app={baseApp} onClick={onClick} />
    );

    expect(screen.getByText("ポータル")).toBeInTheDocument();
    expect(screen.getByText("app-1")).toBeInTheDocument();
    expect(screen.getByText("ポータルの説明")).toBeInTheDocument();
    expect(screen.getByText("https://portal.example.com")).toBeInTheDocument();
    expect(screen.getByText("1 ページ")).toBeInTheDocument();

    const buttons = screen.getAllByRole("button");
    fireEvent.click(buttons[0]);

    expect(onClick).toHaveBeenCalledWith(baseApp);
  });

  it("編集と削除のCTAを配線する", () => {
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    const confirmMock = vi.spyOn(window, "confirm").mockReturnValue(true);

    renderWithProviders(
      <AppCard
        app={baseApp}
        onEdit={onEdit}
        onDelete={onDelete}
      />
    );

    const buttons = screen.getAllByRole("button");
    fireEvent.click(buttons[0]);
    fireEvent.click(buttons[1]);

    expect(onEdit).toHaveBeenCalledWith(baseApp);
    expect(confirmMock).toHaveBeenCalledWith(
      "プロジェクト「ポータル」を削除しますか?\n関連するページも全て削除されます。"
    );
    expect(onDelete).toHaveBeenCalledWith("app-1");
  });
});
