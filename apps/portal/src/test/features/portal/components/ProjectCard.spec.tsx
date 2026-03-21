import { fireEvent, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import ProjectCard from "../../../../features/portal/components/ProjectCard";
import type { ProjectDataType } from "../../../../features/portal/types/project";
import { renderWithProviders } from "../../../renderWithProviders";

const baseProject: ProjectDataType = {
  projectId: "project-1",
  name: "ポータル",
  description: "ポータルの説明",
  urlDomain: "https://portal.example.com",
  iconName: "Home",
  color: "#1976d2",
  pages: [
    {
      pageId: "page-1",
      projectId: "project-1",
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

describe("ProjectCard", () => {
  it("主要情報を描画してカードクリックを通知する", () => {
    const onClick = vi.fn();

    renderWithProviders(
      <ProjectCard project={baseProject} onClick={onClick} />
    );

    expect(screen.getByText("ポータル")).toBeInTheDocument();
    expect(screen.getByText("project-1")).toBeInTheDocument();
    expect(screen.getByText("ポータルの説明")).toBeInTheDocument();
    expect(screen.getByText("https://portal.example.com")).toBeInTheDocument();
    expect(screen.getByText("1 ページ")).toBeInTheDocument();

    const buttons = screen.getAllByRole("button");
    fireEvent.click(buttons[0]);

    expect(onClick).toHaveBeenCalledWith(baseProject);
  });

  it("編集と削除のCTAを配線する", () => {
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    const confirmMock = vi.spyOn(window, "confirm").mockReturnValue(true);

    renderWithProviders(
      <ProjectCard
        project={baseProject}
        onEdit={onEdit}
        onDelete={onDelete}
      />
    );

    const buttons = screen.getAllByRole("button");
    fireEvent.click(buttons[0]);
    fireEvent.click(buttons[1]);

    expect(onEdit).toHaveBeenCalledWith(baseProject);
    expect(confirmMock).toHaveBeenCalledWith(
      "プロジェクト「ポータル」を削除しますか?\n関連するページも全て削除されます。"
    );
    expect(onDelete).toHaveBeenCalledWith("project-1");
  });
});
