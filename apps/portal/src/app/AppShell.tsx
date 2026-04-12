import { useState } from "react";
import { Box, Toolbar } from "@mui/material";
import { Outlet } from "react-router-dom";
import { useAuth } from "@workops-suite/shared-auth";
import { AppBarNavigation } from "@workops-suite/shared-navigation";
import { NavigationDrawer } from "./Drawer";
import AppModal from "../features/portal/components/modals/AppModal";
import { useApps } from "../features/portal/hooks/useApps";

const appTitle = "ポータル";

export default function AppShell() {
  const { userInfo, signOut } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const toggleDrawer = () => setDrawerOpen((prev) => !prev);
  const displayName = userInfo?.username;
  const [isAppModalOpen, setIsAppModalOpen] = useState(false);
  const { apps } = useApps();

  return (
    <Box sx={{ display: "flex" }}>
      <AppBarNavigation
        title={appTitle}
        displayName={displayName}
        onToggleDrawer={toggleDrawer}
        onSignOut={signOut}
      />
      <NavigationDrawer
        apps={apps}
        canCreateApp={userInfo.isGlobalAdmin === true}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onCreateApp={() => {
          setDrawerOpen(false);
          setIsAppModalOpen(true);
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
      <AppModal
        open={isAppModalOpen}
        onClose={() => setIsAppModalOpen(false)}
      />
    </Box>
  );
}
