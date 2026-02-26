import { ReactElement } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import AppShell from "./AppShell";
import { RequestTypeList } from "../features/admin/components/RequestTypeList";
import { RequestList } from "../features/requests/components/RequestList";
import { RequestDetail } from "../features/requests/components/RequestDetail";
import { RouteGuard } from "../shared/auth/RouteGuard";

// アプリ全体のルーティング構成を集中管理する
const routeEntries: { path: string; element: ReactElement }[] = [
  { path: "/dashboard", element: <div>ダッシュボード</div> },
  { path: "/requests", element: <RequestList /> },
  { path: "/requests/:id", element: <RequestDetail /> },
  {
    path: "/manager/request-types",
    element: (
      <RouteGuard
        action="read"
        subject="RequestTypePage"
        fallbackPath="/requests"
      >
        <RequestTypeList />
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
