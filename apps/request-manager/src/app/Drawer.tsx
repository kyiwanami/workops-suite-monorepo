import {
  Drawer,
  Toolbar,
  List,
  ListItemButton,
  ListItemText,
} from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import { Can } from "../shared/auth/ability";
import { type AppAction, type AppSubject } from "../shared/auth/types";

// ナビゲーションで表示する全メニューをここで一元管理する
type PublicDrawerItem = {
  label: string;
  path: string;
};

type ProtectedDrawerItem = {
  label: string;
  path: string;
  action: AppAction;
  subject: AppSubject;
};

type DrawerItem = PublicDrawerItem | ProtectedDrawerItem;

const drawerItems: DrawerItem[] = [
  { label: "ダッシュボード", path: "/dashboard" },
  { label: "申請一覧", path: "/requests" },
  {
    label: "申請種別管理",
    path: "/manager/request-types",
    action: "read",
    subject: "RequestTypeMenu",
  },
];

type DrawerProps = {
  currentPath: string;
  open: boolean;
  onClose: () => void;
};

export function NavigationDrawer({ currentPath, open, onClose }: DrawerProps) {
  return (
    <Drawer
      variant="temporary"
      open={open}
      onClose={onClose}
      ModalProps={{ keepMounted: true }}
      sx={{
        "& .MuiDrawer-paper": { width: 240, boxSizing: "border-box" },
      }}
    >
      <Toolbar />
      <List>
        {drawerItems.map((item) => {
          if (!("action" in item) || !("subject" in item)) {
            return (
              <ListItemButton
                key={item.path}
                component={RouterLink}
                to={item.path}
                selected={currentPath.startsWith(item.path)}
                onClick={onClose}
              >
                <ListItemText primary={item.label} />
              </ListItemButton>
            );
          }

          return (
            <Can key={item.path} I={item.action} a={item.subject}>
              <ListItemButton
                component={RouterLink}
                to={item.path}
                selected={currentPath.startsWith(item.path)}
                onClick={onClose}
              >
                <ListItemText primary={item.label} />
              </ListItemButton>
            </Can>
          );
        })}
      </List>
    </Drawer>
  );
}
