import { AppBar, Toolbar, Typography, IconButton, Stack } from "@mui/material";
import { Theme } from "@mui/material/styles";
import { useAuth } from "@workops-suite/shared-auth";
import MenuIcon from "@mui/icons-material/Menu";
import NotificationsIcon from "@mui/icons-material/Notifications";
import SettingsIcon from "@mui/icons-material/Settings";
import LogoutIcon from "@mui/icons-material/Logout";

const navActions = [
  { key: "notifications", icon: <NotificationsIcon />, label: "通知" },
  { key: "settings", icon: <SettingsIcon />, label: "設定" },
];

type AppBarNavigationProps = {
  onToggleDrawer: () => void;
};

export function AppBarNavigation({ onToggleDrawer }: AppBarNavigationProps) {
  const { userInfo, signOut } = useAuth();
  const displayName = userInfo?.username;

  return (
    <AppBar
      position="fixed"
      sx={{ zIndex: (theme: Theme) => theme.zIndex.drawer + 1 }}
    >
      <Toolbar>
        <IconButton
          color="inherit"
          edge="start"
          onClick={onToggleDrawer}
          sx={{ mr: 2 }}
        >
          <MenuIcon />
        </IconButton>
        <Typography variant="h6" sx={{ flexGrow: 1 }}>
          Request Manager
        </Typography>
        <Stack direction="row" spacing={1} alignItems="center">
          <Typography variant="body2">{displayName}</Typography>
          {navActions.map((action) => (
            <IconButton
              key={action.key}
              color="inherit"
              aria-label={action.label}
            >
              {action.icon}
            </IconButton>
          ))}
          <IconButton color="inherit" onClick={signOut}>
            <LogoutIcon />
          </IconButton>
        </Stack>
      </Toolbar>
    </AppBar>
  );
}
