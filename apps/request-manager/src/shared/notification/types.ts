import { createContext } from "react";

/** 通知の種類 */
export type NotificationSeverity = "success" | "error" | "info" | "warning";

/** 通知の状態 */
export interface NotificationState {
  open: boolean;
  message: string;
  severity: NotificationSeverity;
}

/** 通知オプション */
export interface NotificationOptions {
  /** 自動閉じる時間（ミリ秒）デフォルト: 6000 */
  autoHideDuration?: number;
  /** 閉じる時のコールバック */
  onClose?: () => void;
}

/** 通知コンテキストの型定義 */
export interface NotificationContextType {
  /** 成功通知を表示 */
  showSuccess: (message: string, options?: NotificationOptions) => void;
  /** エラー通知を表示 */
  showError: (message: string, options?: NotificationOptions) => void;
  /** 情報通知を表示 */
  showInfo: (message: string, options?: NotificationOptions) => void;
  /** 警告通知を表示 */
  showWarning: (message: string, options?: NotificationOptions) => void;
  /** 全ての通知をクリア */
  clearNotifications: () => void;
  /** 現在の通知状態 */
  notification: NotificationState;
}

/** 通知コンテキスト */
export const NotificationContext = createContext<
  NotificationContextType | undefined
>(undefined);
