import { useState } from "react";
import { Box, Toolbar } from "@mui/material";
import { Outlet, useLocation } from "react-router-dom";
import { AppBarNavigation } from "./AppBar";
import { NavigationDrawer } from "./Drawer";

export default function AppShell() {
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const toggleDrawer = () => setDrawerOpen((prev) => !prev);

  return (
    <Box sx={{ display: "flex" }}>
      <AppBarNavigation onToggleDrawer={toggleDrawer} />
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
