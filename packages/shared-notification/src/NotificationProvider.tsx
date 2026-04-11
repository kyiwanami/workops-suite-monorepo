import { useState, useMemo, useCallback, type ReactNode } from "react";
import {
  NotificationContext,
  type NotificationContextType,
  type NotificationState,
  type NotificationOptions,
} from "./types";
import { NotificationContainer } from "./NotificationContainer";

interface NotificationProviderProps {
  children: ReactNode;
}

/**
 * 統一された通知管理
 */
export const NotificationProvider = ({
  children,
}: NotificationProviderProps) => {
  const [notification, setNotification] = useState<NotificationState>({
    open: false,
    message: "",
    severity: "info",
  });
  const [currentOptions, setCurrentOptions] = useState<NotificationOptions>({});

  const showNotification = useCallback(
    (
      message: string,
      severity: NotificationState["severity"],
      options?: NotificationOptions
    ) => {
      setNotification({
        open: true,
        message,
        severity,
      });
      setCurrentOptions(options || {});
    },
    []
  );

  const handleClose = useCallback(() => {
    setNotification((prev) => ({ ...prev, open: false }));
    setCurrentOptions({});
  }, []);

  const value: NotificationContextType = useMemo(
    () => ({
      showSuccess: (message: string, options?: NotificationOptions) => {
        showNotification(message, "success", options);
      },
      showError: (message: string, options?: NotificationOptions) => {
        showNotification(message, "error", options);
      },
      showInfo: (message: string, options?: NotificationOptions) => {
        showNotification(message, "info", options);
      },
      showWarning: (message: string, options?: NotificationOptions) => {
        showNotification(message, "warning", options);
      },
      clearNotifications: () => {
        handleClose();
      },
      notification,
    }),
    [showNotification, handleClose, notification]
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <NotificationContainer
        notification={notification}
        options={currentOptions}
        onClose={handleClose}
      />
    </NotificationContext.Provider>
  );
};
