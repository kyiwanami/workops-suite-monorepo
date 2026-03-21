import { fireEvent, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Portal from "../../../features/portal/Portal";
import type {
  PageDataType,
  ProjectDataType,
} from "../../../features/portal/types/project";
import { renderWithProviders } from "../../renderWithProviders";

const useProjectsMock = vi.hoisted(() => vi.fn());
const usePagesMock = vi.hoisted(() => vi.fn());
const useSearchParamsMock = vi.hoisted(() => vi.fn());

vi.mock("react-router", () => ({
  useSearchParams: useSearchParamsMock,
}));

vi.mock("../../../features/portal/hooks/useProjects", () => ({
  useProjects: useProjectsMock,
}));

vi.mock("../../../features/portal/hooks/usePages", () => ({
  usePages: usePagesMock,
}));

vi.mock("../../../features/portal/components/PageCard", () => ({
  default: ({
    page,
    onEdit,
    onDelete,
  }: {
    page: PageDataType;
    onEdit?: (page: PageDataType) => void;
    onDelete?: (pageId: string, projectId: string, pageName: string) => void;
  }) => (
    <div data-testid={`page-card-${page.pageId}`}>
      <span>{page.name}</span>
      <button type="button" onClick={() => onEdit?.(page)}>
        edit-page
      </button>
      <button
        type="button"
        onClick={() => onDelete?.(page.pageId, page.projectId, page.name)}
      >
        delete-page
      </button>
    </div>
  ),
}));

vi.mock("../../../features/portal/components/modals/PageModal", () => ({
  default: ({
    open,
    selectedProject,
    editingPage,
    onClose,
  }: {
    open: boolean;
    selectedProject: ProjectDataType;
    editingPage?: PageDataType | null;
    onClose: () => void;
  }) =>
    open ? (
      <div data-testid="page-modal">
        <span>{selectedProject.name}</span>
        <span>{editingPage ? editingPage.name : "new-page"}</span>
        <button type="button" onClick={onClose}>
          close-page-modal
        </button>
      </div>
    ) : null,
}));

vi.mock("../../../features/portal/components/modals/ProjectModal", () => ({
  default: ({
    open,
    editingProject,
    onClose,
  }: {
    open: boolean;
    editingProject?: ProjectDataType | null;
    onClose: () => void;
  }) =>
    open ? (
      <div data-testid="project-modal">
        <span>{editingProject?.name ?? "new-project"}</span>
        <button type="button" onClick={onClose}>
          close-project-modal
        </button>
      </div>
    ) : null,
}));

const project = {
  projectId: "project-1",
  name: "Portal Project",
  description: "Portal description",
  urlDomain: "https://example.com",
  iconName: "Home",
  color: "#1976d2",
  pages: [],
} satisfies ProjectDataType;

const page = {
  pageId: "page-1",
  projectId: "project-1",
  name: "Home Page",
  description: "Home page description",
  relativePath: "home",
  iconName: "Home",
} satisfies PageDataType;

beforeEach(() => {
  vi.clearAllMocks();
  useSearchParamsMock.mockReturnValue([new URLSearchParams("?projectId=project-1"), vi.fn()]);
  useProjectsMock.mockReturnValue({
    projects: [project],
    isLoading: false,
    deleteProject: vi.fn(),
  });
  usePagesMock.mockReturnValue({
    pages: [page],
    isLoading: false,
    createPage: vi.fn(),
    updatePage: vi.fn(),
    deletePage: vi.fn(),
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("Portal", () => {
  it("プロジェクトとページを表示し、モーダルを開ける", () => {
    renderWithProviders(<Portal />);

    expect(screen.getByText("Portal Project")).toBeInTheDocument();
    expect(screen.getByText("Home Page")).toBeInTheDocument();
    expect(usePagesMock).toHaveBeenCalledWith("project-1");

    fireEvent.click(screen.getByRole("button", { name: "edit project" }));
    expect(screen.getByTestId("project-modal")).toHaveTextContent("Portal Project");

    fireEvent.click(screen.getByRole("button", { name: "ページ追加" }));
    expect(screen.getByTestId("page-modal")).toHaveTextContent("new-page");
    expect(screen.getByTestId("page-modal")).toHaveTextContent("Portal Project");
  });

  it("削除確認で yes/no を分岐し、ページ削除も呼び出す", () => {
    const confirmSpy = vi.spyOn(window, "confirm");
    const deleteProjectMock = vi.fn();
    const deletePageMock = vi.fn();

    useProjectsMock.mockReturnValue({
      projects: [project],
      isLoading: false,
      deleteProject: deleteProjectMock,
    });
    usePagesMock.mockReturnValue({
      pages: [page],
      isLoading: false,
      createPage: vi.fn(),
      updatePage: vi.fn(),
      deletePage: deletePageMock,
    });

    renderWithProviders(<Portal />);

    confirmSpy.mockReturnValueOnce(false);
    fireEvent.click(screen.getByRole("button", { name: "delete project" }));
    expect(deleteProjectMock).not.toHaveBeenCalled();

    confirmSpy.mockReturnValueOnce(true);
    fireEvent.click(screen.getByRole("button", { name: "delete project" }));
    expect(deleteProjectMock).toHaveBeenCalledWith("project-1");

    confirmSpy.mockReturnValueOnce(true);
    fireEvent.click(screen.getByRole("button", { name: "delete-page" }));
    expect(deletePageMock).toHaveBeenCalledWith("page-1", "project-1");
  });
});
