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

    fireEvent.change(screen.getByLabelText("プロジェクト名"), {
      target: { value: "業務ポータル" },
    });
    fireEvent.change(screen.getByLabelText("プロジェクトID"), {
      target: { value: "portal" },
    });
    fireEvent.change(screen.getByLabelText("ドメインURL"), {
      target: { value: "https://portal.example.com" },
    });
    fireEvent.change(screen.getByLabelText("アイコン名"), {
      target: { value: "Home" },
    });
    fireEvent.change(screen.getByLabelText("カラーテーマ"), {
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

    expect(screen.getByLabelText("プロジェクトID")).toHaveValue("project-1");
    expect(screen.getByLabelText("プロジェクト名")).toHaveValue("ポータル");

    fireEvent.change(screen.getByLabelText("説明"), {
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
