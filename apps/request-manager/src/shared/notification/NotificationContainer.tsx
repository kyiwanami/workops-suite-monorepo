import { Alert, Snackbar } from "@mui/material";
import type { NotificationState, NotificationOptions } from "./types";

interface NotificationContainerProps {
  /** 通知の状態 */
  notification: NotificationState;
  /** 通知オプション */
  options?: NotificationOptions;
  /** 通知を閉じる関数 */
  onClose: () => void;
}

/**
 * 統一された通知コンテナーコンポーネント
 */
export const NotificationContainer = ({
  notification,
  options,
  onClose,
}: NotificationContainerProps) => {
  const handleClose = () => {
    options?.onClose?.();
    onClose();
  };

  return (
    <Snackbar
      open={notification.open}
      autoHideDuration={options?.autoHideDuration ?? 6000}
      onClose={handleClose}
      anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
    >
      <Alert
        onClose={handleClose}
        severity={notification.severity}
        sx={{ width: "100%" }}
      >
        {notification.message}
      </Alert>
    </Snackbar>
  );
};
