import MenuIcon from "@mui/icons-material/Menu";
import LogoutIcon from "@mui/icons-material/Logout";
import { AppBar, IconButton, Stack, Toolbar, Typography } from "@mui/material";

export type AppBarNavigationProps = {
  title: string;
  displayName: string | undefined;
  onToggleDrawer: () => void;
  onSignOut: () => void;
};

export function AppBarNavigation({
  title,
  displayName,
  onToggleDrawer,
  onSignOut,
}: AppBarNavigationProps) {
  // 全アプリで共通利用する最小構成の上部バーを描画する。
  return (
    <AppBar
      position="fixed"
      sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}
    >
      <Toolbar>
        <IconButton
          color="inherit"
          edge="start"
          onClick={onToggleDrawer}
          sx={{ mr: 2 }}
          aria-label="メニューを開閉"
        >
          <MenuIcon />
        </IconButton>
        <Typography variant="h6" sx={{ flexGrow: 1 }}>
          {title}
        </Typography>
        <Stack direction="row" spacing={1} alignItems="center">
          <Typography variant="body2">{displayName}</Typography>
          <IconButton
            color="inherit"
            onClick={onSignOut}
            aria-label="ログアウト"
          >
            <LogoutIcon />
          </IconButton>
        </Stack>
      </Toolbar>
    </AppBar>
  );
}
