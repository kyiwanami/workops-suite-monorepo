import { ReactElement } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import AppShell from "./AppShell";
import { TodoList } from "../features/todo/components/TodoPage";
import Portal from "../features/portal/Portal";
import UserManagement from "../features/user-management/UserManagement";
import DepartmentManagement from "../features/department-management/DepartmentManagement";
import { RouteGuard } from "../shared/auth/RouteGuard";

// アプリ全体のルーティング構成を集中管理する
const routeEntries: { path: string; element: ReactElement }[] = [
  { path: "/", element: <Portal /> },
  { path: "/todos", element: <TodoList /> },
  {
    path: "/user-management",
    element: (
      <RouteGuard
        action="read"
        subject="UserManagementPage"
        fallbackPath="/"
      >
        <UserManagement />
      </RouteGuard>
    ),
  },
  {
    path: "/department-management",
    element: (
      <RouteGuard
        action="read"
        subject="DepartmentManagementPage"
        fallbackPath="/"
      >
        <DepartmentManagement />
      </RouteGuard>
    ),
  },
  { path: "*", element: <Navigate to="/" replace /> },
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
