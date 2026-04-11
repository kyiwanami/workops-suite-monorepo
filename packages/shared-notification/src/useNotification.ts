import { useContext } from "react";
import { NotificationContext } from "./types";

/**
 * 通知システムのカスタムフック
 *
 * @returns 通知コンテキストのメソッドと状態
 * @throws NotificationProvider内でのみ使用可能
 */
export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error(
      "useNotification must be used within a NotificationProvider"
    );
  }
  return context;
};
