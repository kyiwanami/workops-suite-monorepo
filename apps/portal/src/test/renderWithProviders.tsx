import { render } from "@testing-library/react";
import type { ReactElement, ReactNode } from "react";
import { MemoryRouter } from "react-router-dom";

type InitialEntry = `/${string}`;

interface RenderWithProvidersOptions {
  initialEntries?: InitialEntry[];
}

interface TestWrapperProps {
  children: ReactNode;
  initialEntries: InitialEntry[];
}

const TestWrapper = ({
  children,
  initialEntries,
}: TestWrapperProps): ReactElement => {
  return <MemoryRouter initialEntries={initialEntries}>{children}</MemoryRouter>;
};

// 各 portal テストで同じ Router 初期化を再利用する。
export const renderWithProviders = (
  ui: ReactElement,
  options?: RenderWithProvidersOptions
) => {
  const initialEntries = options?.initialEntries ?? ["/"];

  return render(ui, {
    wrapper: ({ children }) => (
      <TestWrapper initialEntries={initialEntries}>{children}</TestWrapper>
    ),
  });
};
