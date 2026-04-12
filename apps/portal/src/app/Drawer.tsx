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
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import FiberManualRecordIcon from "@mui/icons-material/FiberManualRecord";
import { Link as RouterLink } from "react-router-dom";
import { useLocation } from "react-router-dom";
import { Can } from "../shared/auth/ability";
import { type AppAction, type AppSubject } from "../shared/auth/types";
import type { ProjectDataType } from "../features/portal/types/project";
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
  projects: ProjectDataType[];
  canCreateProject: boolean;
  open: boolean;
  onClose: () => void;
  onCreateProject: () => void;
};

export function NavigationDrawer({
  projects,
  canCreateProject,
  open,
  onClose,
  onCreateProject,
}: DrawerProps) {
  const location = useLocation();
  const selectedProjectId = new URLSearchParams(location.search).get("projectId");
  const sortedProjects = [...projects].sort((left, right) =>
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
                selected={location.pathname === item.path && !selectedProjectId}
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
        {sortedProjects.map((project) => {
          const ProjectIcon = getIconComponent(project.iconName) ?? FiberManualRecordIcon;

          return (
            <ListItem key={project.projectId} disablePadding>
              <ListItemButton
                component={RouterLink}
                to={`/?projectId=${project.projectId}`}
                selected={
                  location.pathname === "/" && selectedProjectId === project.projectId
                }
                onClick={onClose}
                sx={{ pl: 4 }}
              >
                <ListItemIcon sx={{ minWidth: 32, color: project.color ?? "inherit" }}>
                  <ProjectIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText primary={project.name} />
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>
      {canCreateProject && (
        <>
          <Divider />
          <Box sx={{ p: 2 }}>
            <Button
              variant="contained"
              fullWidth
              startIcon={<AddIcon />}
              onClick={onCreateProject}
            >
              プロジェクト追加
            </Button>
          </Box>
        </>
      )}
    </Drawer>
  );
}
