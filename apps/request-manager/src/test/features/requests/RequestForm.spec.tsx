import { createContext, useContext, useMemo } from "react";
import type * as React from "react";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "../../renderWithProviders";
import { RequestFormDialog } from "../../../features/requests/components/RequestForm";

const showError = vi.fn();
const showSuccess = vi.fn();
const createRequest = vi.fn();
const updateRequest = vi.fn();
const submitRequest = vi.fn();

vi.mock("@workops-suite/shared-notification", () => ({
  useNotification: () => ({
    showError,
    showSuccess,
  }),
}));

vi.mock("@workops-suite/shared-auth", () => ({
  useAuth: () => ({
    userInfo: {
      userId: "user-1",
      departmentCode: "D-001",
    },
  }),
}));

vi.mock("../../../shared/auth/ability", () => ({
  AbilityContext: {},
}));

vi.mock("@casl/react", () => ({
  useAbility: () => ({
    can: () => true,
  }),
}));

vi.mock("../../../features/requests/hooks/useRequestTypes", () => ({
  useRequestTypes: () => ({
    requestTypes: [
      { id: "rt-1", name: "経費精算", isActive: true },
      { id: "rt-2", name: "出張", isActive: false },
    ],
    loading: false,
  }),
}));

vi.mock("../../../features/requests/hooks/useRequest", () => ({
  useRequest: () => ({
    request: null,
    createRequest,
    updateRequest,
    submitRequest,
  }),
}));

vi.mock("@base-ui/react/number-field", async () => {
  type NumberFieldContextValue = {
    value: number | null;
    onValueChange?: (value: number | null) => void;
    disabled?: boolean;
    name?: string;
    inputRef?: React.Ref<HTMLInputElement>;
  };

  const NumberFieldContext = createContext<NumberFieldContextValue | null>(null);

  const Root = ({
    value,
    onValueChange,
    disabled,
    name,
    inputRef,
    children,
  }: {
    value: number | null;
    onValueChange?: (value: number | null) => void;
    disabled?: boolean;
    name?: string;
    inputRef?: React.Ref<HTMLInputElement>;
    children: React.ReactNode;
  }) => {
    const context = useMemo(
      () => ({
        value,
        onValueChange,
        disabled,
        name,
        inputRef,
      }),
      [value, onValueChange, disabled, name, inputRef]
    );

    return (
      <NumberFieldContext.Provider value={context}>
        {children}
      </NumberFieldContext.Provider>
    );
  };

  const Group = ({ children }: { children: React.ReactNode }) => <>{children}</>;

  const Input = (
    props: React.InputHTMLAttributes<HTMLInputElement> & { onBlur?: () => void }
  ) => {
    const context = useContext(NumberFieldContext);
    const value = context?.value ?? "";

    return (
      <input
        {...props}
        ref={context?.inputRef}
        name={context?.name}
        disabled={context?.disabled}
        value={value}
        onBlur={props.onBlur}
        onChange={(event) => {
          const raw = event.target.value;
          context?.onValueChange?.(raw === "" ? null : Number(raw));
        }}
      />
    );
  };

  return {
    NumberField: {
      Root,
      Group,
      Input,
    },
  };
});

describe("RequestFormDialog", () => {
  it("下書き保存で作成内容を保存する", async () => {
    createRequest.mockResolvedValue({
      id: "req-1",
      requestTypeId: "rt-1",
      title: "備品購入",
      description: "周辺機器",
      amount: 12000,
      status: "draft",
    });

    renderWithProviders(
      <RequestFormDialog open onClose={vi.fn()} />
    );

    fireEvent.mouseDown(screen.getByRole("combobox"));
    fireEvent.click(screen.getByRole("option", { name: "経費精算" }));
    fireEvent.change(screen.getByRole("textbox", { name: /タイトル/ }), {
      target: { value: "備品購入" },
    });
    fireEvent.change(screen.getByRole("textbox", { name: /説明/ }), {
      target: { value: "周辺機器" },
    });
    fireEvent.change(screen.getByPlaceholderText("10000"), {
      target: { value: "12000" },
    });
    fireEvent.click(screen.getByRole("button", { name: "下書き保存" }));

    await waitFor(() => {
      expect(createRequest).toHaveBeenCalledWith({
        departmentId: "D-001",
        requesterSub: "user-1",
        requestTypeId: "rt-1",
        title: "備品購入",
        description: "周辺機器",
        amount: 12000,
      });
      expect(showSuccess).toHaveBeenCalledWith("申請を保存しました");
    });
  });

  it("提出で作成後に提出状態へ更新する", async () => {
    createRequest.mockResolvedValue({
      id: "req-2",
      requestTypeId: "rt-1",
      title: "備品購入",
      description: "周辺機器",
      amount: 12000,
      status: "draft",
    });
    updateRequest.mockResolvedValue({
      id: "req-2",
      status: "submitted",
      submittedAt: "2026-03-21T00:00:00.000Z",
    });

    renderWithProviders(
      <RequestFormDialog open onClose={vi.fn()} />
    );

    fireEvent.mouseDown(screen.getByRole("combobox"));
    fireEvent.click(screen.getByRole("option", { name: "経費精算" }));
    fireEvent.change(screen.getByRole("textbox", { name: /タイトル/ }), {
      target: { value: "備品購入" },
    });
    fireEvent.change(screen.getByRole("textbox", { name: /説明/ }), {
      target: { value: "周辺機器" },
    });
    fireEvent.change(screen.getByPlaceholderText("10000"), {
      target: { value: "12000" },
    });
    fireEvent.click(screen.getByRole("button", { name: "提出" }));

    await waitFor(() => {
      expect(createRequest).toHaveBeenCalled();
      expect(updateRequest).toHaveBeenCalledWith({
        id: "req-2",
        status: "submitted",
        submittedAt: expect.any(String),
      });
      expect(showSuccess).toHaveBeenCalledWith("申請を提出しました");
    });
  });
});
