import { useState, useRef, useEffect } from "react";
import {
  Box,
  Typography,
  TextField,
  IconButton,
} from "@mui/material";
import {
  Send as SendIcon,
} from "@mui/icons-material";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useChatBot } from "../hooks/useChatBot";

interface ChatPanelProps {
  sessionId: string;
}

const assistantMessageMarkdownSx = {
  "& p": { mt: 0, mb: 1, lineHeight: 1.7 },
  "& p:last-of-type": { mb: 0 },
  "& ul, & ol": { mt: 0.5, mb: 1, pl: 3 },
  "& li": { mb: 0.5 },
  "& li:last-child": { mb: 0 },
  "& pre": {
    mt: 1,
    mb: 1,
    p: 1.25,
    borderRadius: 1.5,
    bgcolor: "#1f2937",
    color: "#f9fafb",
    overflowX: "auto",
  },
  "& code": {
    px: 0.5,
    py: 0.15,
    borderRadius: 0.75,
    bgcolor: "rgba(15, 23, 42, 0.08)",
    fontSize: "0.82rem",
    fontFamily:
      'ui-monospace, SFMono-Regular, SF Mono, Menlo, Consolas, "Liberation Mono", monospace',
  },
  "& pre code": {
    p: 0,
    bgcolor: "transparent",
    color: "inherit",
    fontSize: "0.8rem",
  },
  "& a": {
    color: "primary.dark",
    textDecoration: "underline",
    wordBreak: "break-all",
  },
  "& blockquote": {
    m: 0,
    px: 1.5,
    py: 0.5,
    borderLeft: "3px solid",
    borderColor: "divider",
    color: "text.secondary",
    fontStyle: "italic",
  },
  "& h1, & h2, & h3, & h4, & h5, & h6": {
    mt: 1.2,
    mb: 0.8,
    lineHeight: 1.3,
  },
  "& table": {
    width: "100%",
    borderCollapse: "collapse",
    mt: 1,
    mb: 1,
    display: "block",
    overflowX: "auto",
  },
  "& th, & td": {
    border: "1px solid",
    borderColor: "divider",
    px: 1,
    py: 0.75,
    textAlign: "left",
    verticalAlign: "top",
    whiteSpace: "nowrap",
  },
  "& th": {
    bgcolor: "rgba(15, 23, 42, 0.06)",
    fontWeight: 600,
  },
};

export function ChatPanel({ sessionId }: ChatPanelProps) {
  const [input, setInput] = useState("");
  const { messages, loading, sendMessage } = useChatBot(sessionId);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messages.length > 0) {
      // streaming中の本文更新を含め、最後のmessageを表示し続ける。
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const handleSend = () => {
    if (input) {
      void sendMessage(input);
      setInput("");
    }
  };

  return (
    <>
      <Box
        sx={{
          flex: 1,
          overflowY: "auto",
          p: 2,
        }}
      >
        {messages.map((msg) => (
          <Box
            key={msg.id}
            sx={{
              display: "flex",
              justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
              mb: 1,
            }}
          >
            <Box
              sx={{
                bgcolor: msg.role === "user" ? "primary.main" : "#f0f0f0",
                color: msg.role === "user" ? "white" : "black",
                p: 1.5,
                borderRadius: 2,
                maxWidth: "75%",
              }}
            >
              {/* AI応答はMarkdownとして描画し、可読性を保つスタイルを適用 */}
              {msg.role === "assistant" ? (
                <Box sx={assistantMessageMarkdownSx}>
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {msg.content}
                  </ReactMarkdown>
                </Box>
              ) : (
                <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
                  {msg.content}
                </Typography>
              )}

            </Box>
          </Box>
        ))}
        {loading && messages.length > 0 && (
          <Box sx={{ display: "flex", justifyContent: "flex-start", mb: 1 }}>
            <Box sx={{ bgcolor: "#f0f0f0", p: 1.5, borderRadius: 2 }}>
              <Typography variant="body2">...</Typography>
            </Box>
          </Box>
        )}
        <div ref={messagesEndRef} />
      </Box>

      <Box
        sx={{
          p: 2,
          borderTop: "1px solid #e0e0e0",
          display: "flex",
          gap: 1,
          alignItems: "flex-end",
        }}
      >
        <TextField
          fullWidth
          size="small"
          multiline
          maxRows={4}
          placeholder="質問を入力..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void handleSend();
            }
          }}
          disabled={loading}
        />
        <IconButton
          onClick={() => void handleSend()}
          color="primary"
          disabled={loading || !input}
        >
          <SendIcon />
        </IconButton>
      </Box>
    </>
  );
}
