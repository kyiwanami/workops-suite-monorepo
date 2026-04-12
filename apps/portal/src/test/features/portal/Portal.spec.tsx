import { fireEvent, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Portal from "../../../features/portal/Portal";
import type {
  PageDataType,
  AppDataType,
} from "../../../features/portal/types/app";
import { renderWithProviders } from "../../renderWithProviders";

const useAppsMock = vi.hoisted(() => vi.fn());
const usePagesMock = vi.hoisted(() => vi.fn());
const useSearchParamsMock = vi.hoisted(() => vi.fn());

vi.mock("react-router", () => ({
  useSearchParams: useSearchParamsMock,
}));

vi.mock("../../../features/portal/hooks/useApps", () => ({
  useApps: useAppsMock,
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
    onDelete?: (pageId: string, appId: string, pageName: string) => void;
  }) => (
    <div data-testid={`page-card-${page.pageId}`}>
      <span>{page.name}</span>
      <button type="button" onClick={() => onEdit?.(page)}>
        edit-page
      </button>
      <button
        type="button"
        onClick={() => onDelete?.(page.pageId, page.appId, page.name)}
      >
        delete-page
      </button>
    </div>
  ),
}));

vi.mock("../../../features/portal/components/modals/PageModal", () => ({
  default: ({
    open,
    selectedApp,
    editingPage,
    onClose,
  }: {
    open: boolean;
    selectedApp: AppDataType;
    editingPage?: PageDataType | null;
    onClose: () => void;
  }) =>
    open ? (
      <div data-testid="page-modal">
        <span>{selectedApp.name}</span>
        <span>{editingPage ? editingPage.name : "new-page"}</span>
        <button type="button" onClick={onClose}>
          close-page-modal
        </button>
      </div>
    ) : null,
}));

vi.mock("../../../features/portal/components/modals/AppModal", () => ({
  default: ({
    open,
    editingApp,
    onClose,
  }: {
    open: boolean;
    editingApp?: AppDataType | null;
    onClose: () => void;
  }) =>
    open ? (
      <div data-testid="app-modal">
        <span>{editingApp?.name ?? "new-app"}</span>
        <button type="button" onClick={onClose}>
          close-app-modal
        </button>
      </div>
    ) : null,
}));

const app = {
  appId: "app-1",
  name: "Portal App",
  description: "Portal description",
  urlDomain: "https://example.com",
  iconName: "Home",
  color: "#1976d2",
  pages: [],
} satisfies AppDataType;

const page = {
  pageId: "page-1",
  appId: "app-1",
  name: "Home Page",
  description: "Home page description",
  relativePath: "home",
  iconName: "Home",
} satisfies PageDataType;

beforeEach(() => {
  vi.clearAllMocks();
  useSearchParamsMock.mockReturnValue([new URLSearchParams("?appId=app-1"), vi.fn()]);
  useAppsMock.mockReturnValue({
    apps: [app],
    isLoading: false,
    deleteApp: vi.fn(),
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

    expect(screen.getByText("Portal App")).toBeInTheDocument();
    expect(screen.getByText("Home Page")).toBeInTheDocument();
    expect(usePagesMock).toHaveBeenCalledWith("app-1");

    fireEvent.click(screen.getByRole("button", { name: "edit app" }));
    expect(screen.getByTestId("app-modal")).toHaveTextContent("Portal App");

    fireEvent.click(screen.getByRole("button", { name: "ページ追加" }));
    expect(screen.getByTestId("page-modal")).toHaveTextContent("new-page");
    expect(screen.getByTestId("page-modal")).toHaveTextContent("Portal App");
  });

  it("削除確認で yes/no を分岐し、ページ削除も呼び出す", () => {
    const confirmSpy = vi.spyOn(window, "confirm");
    const deleteAppMock = vi.fn();
    const deletePageMock = vi.fn();

    useAppsMock.mockReturnValue({
      apps: [app],
      isLoading: false,
      deleteApp: deleteAppMock,
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
    fireEvent.click(screen.getByRole("button", { name: "delete app" }));
    expect(deleteAppMock).not.toHaveBeenCalled();

    confirmSpy.mockReturnValueOnce(true);
    fireEvent.click(screen.getByRole("button", { name: "delete app" }));
    expect(deleteAppMock).toHaveBeenCalledWith("app-1");

    confirmSpy.mockReturnValueOnce(true);
    fireEvent.click(screen.getByRole("button", { name: "delete-page" }));
    expect(deletePageMock).toHaveBeenCalledWith("page-1", "app-1");
  });
});
