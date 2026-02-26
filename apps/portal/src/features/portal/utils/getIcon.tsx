import React from "react";
import * as MuiIcons from "@mui/icons-material";
import type { SvgIconComponent } from "@mui/icons-material";

// MUI Iconコンポーネントを名前から取得するヘルパー関数
export const getIcon = (iconName?: string | null): React.JSX.Element | null => {
  if (!iconName) return null;
  const IconComponent = MuiIcons[iconName as keyof typeof MuiIcons];
  return IconComponent ? <IconComponent /> : null;
};

// MUI Iconコンポーネントのクラスを名前から取得するヘルパー関数
export const getIconComponent = (
  iconName?: string | null
): SvgIconComponent | null => {
  if (!iconName) return null;
  const IconComponent = MuiIcons[iconName as keyof typeof MuiIcons];
  return IconComponent || null;
};

// 利用可能なMUIアイコン名のリストを取得
export const getAvailableIconNames = (): string[] => {
  return Object.keys(MuiIcons).filter(
    (key) => typeof MuiIcons[key as keyof typeof MuiIcons] === "function"
  );
};

// アイコン名が有効かどうかをチェック
export const isValidIconName = (
  iconName: string
): iconName is keyof typeof MuiIcons => {
  return (
    iconName in MuiIcons &&
    typeof MuiIcons[iconName as keyof typeof MuiIcons] === "function"
  );
};
