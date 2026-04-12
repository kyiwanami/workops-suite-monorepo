import { useState } from "react";
import { Box, Toolbar } from "@mui/material";
import { Outlet } from "react-router-dom";
import { useAuth } from "@workops-suite/shared-auth";
import { AppBarNavigation } from "@workops-suite/shared-navigation";
import { NavigationDrawer } from "./Drawer";
import ProjectModal from "../features/portal/components/modals/ProjectModal";
import { useProjects } from "../features/portal/hooks/useProjects";

const appTitle = "ポータル";

export default function AppShell() {
  const { userInfo, signOut } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const toggleDrawer = () => setDrawerOpen((prev) => !prev);
  const displayName = userInfo?.username;
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const { projects } = useProjects();

  return (
    <Box sx={{ display: "flex" }}>
      <AppBarNavigation
        title={appTitle}
        displayName={displayName}
        onToggleDrawer={toggleDrawer}
        onSignOut={signOut}
      />
      <NavigationDrawer
        projects={projects}
        canCreateProject={userInfo.isGlobalAdmin === true}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onCreateProject={() => {
          setDrawerOpen(false);
          setIsProjectModalOpen(true);
        }}
      />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
        }}
      >
        <Toolbar />
        <Outlet />
      </Box>
      <ProjectModal
        open={isProjectModalOpen}
        onClose={() => setIsProjectModalOpen(false)}
      />
    </Box>
  );
}
