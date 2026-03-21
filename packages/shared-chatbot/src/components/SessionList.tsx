import { List, ListItem, ListItemButton, ListItemText } from "@mui/material";
import type { Session } from "../types";

interface SessionListProps {
  sessions: Session[];
  onSelectSession: (sessionId: string) => void;
}

export function SessionList({ sessions, onSelectSession }: SessionListProps) {
  return (
    <List sx={{ flex: 1, overflowY: "auto" }}>
      {sessions.map((session) => (
        <ListItem key={session.id} disablePadding>
          <ListItemButton onClick={() => onSelectSession(session.id)}>
            <ListItemText
              primary={session.name}
              secondary={new Date(session.createdAt).toLocaleString("ja-JP")}
            />
          </ListItemButton>
        </ListItem>
      ))}
    </List>
  );
}
