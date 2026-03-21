import { fireEvent, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TodoList } from "../../../../features/todo/components/TodoPage";
import { renderWithProviders } from "../../../renderWithProviders";

const mockUseTodos = vi.hoisted(() => ({
  todos: [
    { id: "todo-1", content: "申請書を作成する" },
    { id: "todo-2", content: "レビューを依頼する" },
  ],
  createTodo: vi.fn(),
}));

vi.mock("../../../../features/todo/hooks/useTodos", () => ({
  useTodos: () => mockUseTodos,
}));

beforeEach(() => {
  mockUseTodos.createTodo.mockReset();
});

describe("TodoList", () => {
  it("一覧を描画して新規作成CTAを配線する", () => {
    renderWithProviders(<TodoList />);

    expect(screen.getByText("My todos")).toBeInTheDocument();
    expect(screen.getByText("申請書を作成する")).toBeInTheDocument();
    expect(screen.getByText("レビューを依頼する")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "+ new" }));

    expect(mockUseTodos.createTodo).toHaveBeenCalled();
  });
});
