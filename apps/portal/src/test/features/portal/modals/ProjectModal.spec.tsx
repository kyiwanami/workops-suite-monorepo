import { fireEvent, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ProjectModal from "../../../../features/portal/components/modals/ProjectModal";
import type { ProjectDataType } from "../../../../features/portal/types/project";
import { renderWithProviders } from "../../../renderWithProviders";

const mockUseProjects = vi.hoisted(() => ({
  projects: [] satisfies ProjectDataType[],
  createProject: vi.fn(),
  updateProject: vi.fn(),
}));

vi.mock("../../../../features/portal/hooks/useProjects", () => ({
  useProjects: () => mockUseProjects,
}));

const editingProject: ProjectDataType = {
  projectId: "project-1",
  name: "ポータル",
  description: "ポータルの説明",
  urlDomain: "https://portal.example.com",
  iconName: "Home",
  color: "#1976d2",
  pages: [],
};

beforeEach(() => {
  mockUseProjects.projects = [];
  mockUseProjects.createProject.mockReset();
  mockUseProjects.updateProject.mockReset();
  mockUseProjects.createProject.mockResolvedValue(undefined);
  mockUseProjects.updateProject.mockResolvedValue(undefined);
});

describe("ProjectModal", () => {
  it("新規作成の入力を createProject に渡す", async () => {
    const onClose = vi.fn();

    renderWithProviders(
      <ProjectModal open onClose={onClose} />
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
      expect(mockUseProjects.createProject).toHaveBeenCalledWith({
        projectId: "portal",
        name: "業務ポータル",
        description: "",
        urlDomain: "https://portal.example.com",
        iconName: "Home",
        color: "#1976d2",
      });
    });
    expect(onClose).toHaveBeenCalled();
  });

  it("編集モードで初期値を復元して updateProject に渡す", async () => {
    const onClose = vi.fn();

    renderWithProviders(
      <ProjectModal
        open
        onClose={onClose}
        editingProject={editingProject}
      />
    );

    expect(screen.getByDisplayValue("project-1")).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "プロジェクト名" })).toHaveValue(
      "ポータル"
    );

    fireEvent.change(screen.getByRole("textbox", { name: "説明" }), {
      target: { value: "更新した説明" },
    });
    fireEvent.click(screen.getByRole("button", { name: "更新" }));

    await waitFor(() => {
      expect(mockUseProjects.updateProject).toHaveBeenCalledWith({
        projectId: "project-1",
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
