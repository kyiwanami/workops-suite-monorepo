import { useState } from "react";
import { Box, Toolbar } from "@mui/material";
import { Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@workops-suite/shared-auth";
import { AppBarNavigation } from "@workops-suite/shared-navigation";
import { NavigationDrawer } from "./Drawer";

const appTitle = "申請マネージャー";

export default function AppShell() {
  const location = useLocation();
  const { userInfo, signOut } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const toggleDrawer = () => setDrawerOpen((prev) => !prev);
  const displayName = userInfo?.username;

  return (
    <Box sx={{ display: "flex" }}>
      <AppBarNavigation
        title={appTitle}
        displayName={displayName}
        onToggleDrawer={toggleDrawer}
        onSignOut={signOut}
      />
      <NavigationDrawer
        currentPath={location.pathname}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
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
    </Box>
  );
}
