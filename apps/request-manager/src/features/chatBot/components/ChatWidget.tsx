import { useEffect, useState } from "react";
import {
  Fab,
  Paper,
  Box,
  Typography,
  IconButton,
  Menu,
  MenuItem,
  ListItemText,
  Tooltip,
} from "@mui/material";
import {
  ChatBubbleOutline as ChatIcon,
  Close as CloseIcon,
  Add as AddIcon,
  History as HistoryIcon,
  Delete as DeleteIcon,
} from "@mui/icons-material";
import { useSessions } from "../hooks/useSessions";
import { useSession } from "../hooks/useSession";
import { ChatPanel } from "./ChatPanel";

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const { sessions, createSession, deleteSession } = useSessions();
  const currentSession = useSession(currentSessionId);

  const handleNewSession = async () => {
    const newId = await createSession();
    if (newId) {
      setCurrentSessionId(newId);
    }
  };

  const handleSelectSession = (sessionId: string) => {
    setCurrentSessionId(sessionId);
    setAnchorEl(null);
  };

  const handleOpenMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleCloseMenu = () => {
    setAnchorEl(null);
  };

  // 初回表示時: セッションがない場合は自動で新規作成
  useEffect(() => {
    if (sessions.length === 0 && !currentSessionId) {
      void (async () => {
        const newId = await createSession();
        if (newId) {
          setCurrentSessionId(newId);
        }
      })();
    }
  }, [sessions.length, currentSessionId, createSession]);

  // ヘッダータイトル取得
  function getHeaderTitle(): string {
    if (!currentSessionId) {
      return "Todo チャット";
    }
    return currentSession?.name ?? "新しいチャット";
  }

  const handleDeleteSession = async (
    sessionId: string,
    event: React.MouseEvent
  ) => {
    event.stopPropagation();
    if (
      window.confirm("この会話を削除しますか？すべてメッセージも削除されます。")
    ) {
      await deleteSession(sessionId);
      if (currentSessionId === sessionId) {
        setCurrentSessionId(null);
      }
      if (sessions.length <= 1) {
        setAnchorEl(null);
      }
    }
  };

  return (
    <>
      <Fab
        color="primary"
        onClick={() => setOpen(true)}
        sx={{
          position: "fixed",
          bottom: 24,
          right: 24,
          display: open ? "none" : "flex",
        }}
      >
        <ChatIcon />
      </Fab>

      {open && (
        <Paper
          elevation={8}
          sx={{
            position: "fixed",
            bottom: 24,
            right: 24,
            width: { xs: "calc(100vw - 48px)", sm: 400 },
            height: 500,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <Box
            sx={{
              bgcolor: "primary.main",
              color: "white",
              p: 2,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Typography variant="h6" sx={{ flex: 1 }}>
              {getHeaderTitle()}
            </Typography>
            <Box sx={{ display: "flex", gap: 1 }}>
              <Tooltip title="会話履歴">
                <IconButton onClick={handleOpenMenu} sx={{ color: "white" }}>
                  <HistoryIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="新しい会話">
                <IconButton
                  onClick={handleNewSession}
                  sx={{ color: "white" }}
                >
                  <AddIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="閉じる">
                <IconButton
                  onClick={() => setOpen(false)}
                  sx={{ color: "white" }}
                >
                  <CloseIcon />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>

          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleCloseMenu}
            anchorOrigin={{
              vertical: "bottom",
              horizontal: "left",
            }}
          >
            {sessions.length === 0 ? (
              <MenuItem disabled>
                <ListItemText primary="履歴がありません" />
              </MenuItem>
            ) : (
              sessions.map((session) => (
                <MenuItem
                  key={session.id}
                  onClick={() => handleSelectSession(session.id)}
                  selected={session.id === currentSessionId}
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 2,
                  }}
                >
                  <ListItemText
                    primary={session.name}
                    secondary={new Date(session.createdAt).toLocaleString(
                      "ja-JP"
                    )}
                  />
                  <IconButton
                    size="small"
                    onClick={(e) => handleDeleteSession(session.id, e)}
                    sx={{ color: "text.secondary" }}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </MenuItem>
              ))
            )}
          </Menu>

          {currentSessionId && <ChatPanel sessionId={currentSessionId} />}
        </Paper>
      )}
    </>
  );
}
