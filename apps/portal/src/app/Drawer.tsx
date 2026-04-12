import {
  Drawer,
  Toolbar,
  List,
  ListItem,
  ListItemIcon,
  ListItemButton,
  ListItemText,
  Box,
  Button,
  Divider,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import FiberManualRecordIcon from "@mui/icons-material/FiberManualRecord";
import { Link as RouterLink } from "react-router-dom";
import { useLocation } from "react-router-dom";
import { Can } from "../shared/auth/ability";
import { type AppAction, type AppSubject } from "../shared/auth/types";
import type { AppDataType } from "../features/portal/types/app";
import { getIconComponent } from "../features/portal/utils/getIcon";

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
  { label: "ポータル", path: "/" },
  {
    label: "ユーザー管理",
    path: "/user-management",
    action: "read",
    subject: "UserManagementMenu",
  },
  {
    label: "部署マスタ",
    path: "/department-management",
    action: "read",
    subject: "DepartmentManagementMenu",
  },
];

type DrawerProps = {
  apps: AppDataType[];
  canCreateApp: boolean;
  open: boolean;
  onClose: () => void;
  onCreateApp: () => void;
};

export function NavigationDrawer({
  apps,
  canCreateApp,
  open,
  onClose,
  onCreateApp,
}: DrawerProps) {
  const location = useLocation();
  const selectedAppId = new URLSearchParams(location.search).get("appId");
  const sortedApps = [...apps].sort((left, right) =>
    left.name.localeCompare(right.name, "ja")
  );

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
                selected={location.pathname === item.path && !selectedAppId}
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
                selected={location.pathname.startsWith(item.path)}
                onClick={onClose}
              >
                <ListItemText primary={item.label} />
              </ListItemButton>
            </Can>
          );
        })}
      </List>
      <Divider />
      <List sx={{ pt: 0 }}>
        {sortedApps.map((app) => {
          const AppIcon = getIconComponent(app.iconName) ?? FiberManualRecordIcon;

          return (
            <ListItem key={app.appId} disablePadding>
              <ListItemButton
                component={RouterLink}
                to={`/?appId=${app.appId}`}
                selected={
                  location.pathname === "/" && selectedAppId === app.appId
                }
                onClick={onClose}
                sx={{ pl: 4 }}
              >
                <ListItemIcon sx={{ minWidth: 32, color: app.color ?? "inherit" }}>
                  <AppIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText primary={app.name} />
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>
      {canCreateApp && (
        <>
          <Divider />
          <Box sx={{ p: 2 }}>
            <Button
              variant="contained"
              fullWidth
              startIcon={<AddIcon />}
              onClick={onCreateApp}
            >
              プロジェクト追加
            </Button>
          </Box>
        </>
      )}
    </Drawer>
  );
}
