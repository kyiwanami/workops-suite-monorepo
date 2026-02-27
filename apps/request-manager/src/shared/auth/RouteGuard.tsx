import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { Can } from "./ability";
import type { AppAction, AppSubjectName } from "./types";

interface RouteGuardProps {
  action: AppAction;
  subject: AppSubjectName;
  fallbackPath: string;
  children: ReactNode;
}

export const RouteGuard = ({
  action,
  subject,
  fallbackPath,
  children,
}: RouteGuardProps) => {
  return (
    <Can I={action} a={subject} passThrough>
      {(allowed) => {
        // ルート直アクセス時にも CASL 判定を適用する
        if (!allowed) {
          return <Navigate to={fallbackPath} replace />;
        }

        return <>{children}</>;
      }}
    </Can>
  );
};
