import { createContext, useContext, useMemo } from "react";
import type * as React from "react";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "../../renderWithProviders";
import { RequestTypeFormDialog } from "../../../features/admin/components/RequestTypeFormDialog";

const showError = vi.fn();
const showSuccess = vi.fn();
const getRequestType = vi.fn();
const createRequestType = vi.fn();
const updateRequestType = vi.fn();

vi.mock("../../../shared/notification", () => ({
  useNotification: () => ({
    showError,
    showSuccess,
  }),
}));

vi.mock("../../../features/admin/hooks/useRequestTypes", () => ({
  useRequestType: () => ({
    getRequestType,
    createRequestType,
    updateRequestType,
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

describe("RequestTypeFormDialog", () => {
  it("新規作成時に入力内容を登録する", async () => {
    createRequestType.mockResolvedValue({
      id: "rt-1",
      code: "EXPENSE",
      name: "経費精算",
      description: "交通費の精算",
      sortOrder: 7,
      isActive: true,
    });

    renderWithProviders(
      <RequestTypeFormDialog open onClose={vi.fn()} />
    );

    fireEvent.change(screen.getByRole("textbox", { name: /コード/ }), {
      target: { value: "EXPENSE" },
    });
    fireEvent.change(screen.getByRole("textbox", { name: /名称/ }), {
      target: { value: "経費精算" },
    });
    fireEvent.change(screen.getByLabelText("説明"), {
      target: { value: "交通費の精算" },
    });
    fireEvent.change(screen.getByPlaceholderText("10"), {
      target: { value: "7" },
    });
    fireEvent.click(screen.getByRole("button", { name: "登録" }));

    await waitFor(() => {
      expect(createRequestType).toHaveBeenCalledWith({
        code: "EXPENSE",
        name: "経費精算",
        description: "交通費の精算",
        sortOrder: 7,
        isActive: true,
      });
      expect(showSuccess).toHaveBeenCalledWith("申請種別を登録しました");
    });
  });

  it("編集時に既存値を読み込み更新する", async () => {
    getRequestType.mockResolvedValue({
      id: "rt-2",
      code: "TRAVEL",
      name: "出張",
      description: "出張申請",
      sortOrder: 3,
      isActive: true,
    });
    updateRequestType.mockResolvedValue({
      id: "rt-2",
      code: "TRAVEL",
      name: "出張",
      description: "出張申請",
      sortOrder: 3,
      isActive: true,
    });

    renderWithProviders(
      <RequestTypeFormDialog open onClose={vi.fn()} id="rt-2" />
    );

    await waitFor(() => {
      expect(getRequestType).toHaveBeenCalledWith("rt-2");
    });
    expect(screen.getByDisplayValue("TRAVEL")).toBeInTheDocument();
    expect(screen.getByDisplayValue("出張")).toBeInTheDocument();

    fireEvent.change(screen.getByRole("textbox", { name: /名称/ }), {
      target: { value: "出張精算" },
    });
    fireEvent.click(screen.getByRole("button", { name: "更新" }));

    await waitFor(() => {
      expect(updateRequestType).toHaveBeenCalledWith({
        id: "rt-2",
        code: "TRAVEL",
        name: "出張精算",
        description: "出張申請",
        sortOrder: 3,
        isActive: true,
      });
      expect(showSuccess).toHaveBeenCalledWith("申請種別を更新しました");
    });
  });
});
