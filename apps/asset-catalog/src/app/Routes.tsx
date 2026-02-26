import { ReactElement } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import AppShell from "./AppShell";
import { AssetList } from "../features/assets/components/AssetList";
import { AssetDetail } from "../features/assets/components/AssetDetail";
import { AssetTypeList } from "../features/assets/components/AssetTypeList";
import { RouteGuard } from "../shared/auth/RouteGuard";

// アプリ全体のルーティング構成を集中管理する
const routeEntries: { path: string; element: ReactElement }[] = [
  { path: "/dashboard", element: <div>ダッシュボード</div> },
  { path: "/assets", element: <AssetList /> },
  { path: "/assets/:id", element: <AssetDetail /> },
  {
    path: "/asset-types",
    element: (
      <RouteGuard action="read" subject="AssetTypePage" fallbackPath="/assets">
        <AssetTypeList />
      </RouteGuard>
    ),
  },
  { path: "*", element: <Navigate to="/dashboard" replace /> },
];

export default function AppRoutes() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        {routeEntries.map((entry) => (
          <Route key={entry.path} path={entry.path} element={entry.element} />
        ))}
      </Route>
    </Routes>
  );
}
