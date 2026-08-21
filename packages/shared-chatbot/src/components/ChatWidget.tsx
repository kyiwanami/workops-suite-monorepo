import { useState } from "react";
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
import { useChatBotConfig } from "../context/ChatBotConfigContext";
import { ChatPanel } from "./ChatPanel";

export default function ChatWidget() {
  const { title: configTitle } = useChatBotConfig();
  const [open, setOpen] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const { sessions, createSession, deleteSession } = useSessions();
  const currentSession = sessions.find((session) => session.id === currentSessionId);

  const handleNewSession = () => {
    setCurrentSessionId(createSession());
  };

  const handleOpen = () => {
    setOpen(true);
    if (!currentSessionId) {
      setCurrentSessionId(createSession());
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

  // ヘッダータイトル取得
  function getHeaderTitle(): string {
    if (!currentSessionId) {
      return configTitle ?? "チャット";
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
      try {
        await deleteSession(sessionId);
        // 削除APIが成功したときだけ、表示中のsessionを閉じる。
        if (currentSessionId === sessionId) {
          setCurrentSessionId(null);
        }
        if (sessions.length <= 1) {
          setAnchorEl(null);
        }
      } catch (error) {
        console.error("Session delete UI update skipped", error);
      }
    }
  };

  return (
    <>
      <Fab
        color="primary"
        onClick={handleOpen}
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
                    onClick={(e) => void handleDeleteSession(session.id, e)}
                    sx={{ color: "text.secondary" }}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </MenuItem>
              ))
            )}
          </Menu>

          {currentSessionId && (
            <ChatPanel key={currentSessionId} sessionId={currentSessionId} />
          )}
        </Paper>
      )}
    </>
  );
}
