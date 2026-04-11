import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import {
  NotificationContainer,
  NotificationProvider,
  useNotification,
  type NotificationOptions,
  type NotificationState,
} from "@workops-suite/shared-notification";
import { describe, expect, it, vi } from "vitest";

const NotificationHarness = () => {
  const { showSuccess, showWarning, clearNotifications, notification } =
    useNotification();

  return (
    <div>
      <button onClick={() => showSuccess("保存しました")}>success</button>
      <button
        onClick={() =>
          showWarning("確認してください", {
            autoHideDuration: 1200,
          })
        }
      >
        warning
      </button>
      <button onClick={clearNotifications}>clear</button>
      <output>{notification.message}</output>
      <output>{notification.severity}</output>
    </div>
  );
};

describe("NotificationProvider", () => {
  it("showSuccess で通知を表示する", () => {
    render(
      <NotificationProvider>
        <NotificationHarness />
      </NotificationProvider>
    );

    fireEvent.click(screen.getByRole("button", { name: "success" }));

    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("保存しました");
    expect(alert).toHaveClass("MuiAlert-standardSuccess");
    expect(screen.getByText("保存しました", { selector: "output" })).toBeInTheDocument();
    expect(screen.getByText("success", { selector: "output" })).toBeInTheDocument();
  });

  it("clearNotifications で通知を閉じる", async () => {
    render(
      <NotificationProvider>
        <NotificationHarness />
      </NotificationProvider>
    );

    fireEvent.click(screen.getByRole("button", { name: "warning" }));
    expect(screen.getByRole("alert")).toHaveClass("MuiAlert-standardWarning");

    fireEvent.click(screen.getByRole("button", { name: "clear" }));

    await waitFor(() => {
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });
  });
});

describe("NotificationContainer", () => {
  it("close で両方の close コールバックを呼ぶ", () => {
    const onClose = vi.fn();
    const optionsOnClose = vi.fn();
    const notification: NotificationState = {
      open: true,
      message: "エラーが発生しました",
      severity: "error",
    };
    const options: NotificationOptions = {
      onClose: optionsOnClose,
      autoHideDuration: 2000,
    };

    render(
      <NotificationContainer
        notification={notification}
        options={options}
        onClose={onClose}
      />
    );

    expect(screen.getByRole("alert")).toHaveClass("MuiAlert-standardError");

    fireEvent.click(screen.getByRole("button", { name: /close/i }));

    expect(optionsOnClose).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
