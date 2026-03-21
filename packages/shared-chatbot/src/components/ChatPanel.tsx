import { useState, useRef, useEffect } from "react";
import {
  Box,
  Typography,
  TextField,
  IconButton,
  Button,
  Chip,
  Tooltip,
} from "@mui/material";
import {
  Send as SendIcon,
  AttachFile as AttachFileIcon,
  Close as CloseIcon,
} from "@mui/icons-material";
import { fromByteArray } from "base64-js";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { MessageTraces } from "./MessageTraces";
import {
  useChatBot,
  validateFiles,
  type Attachment,
} from "../hooks/useChatBot";

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
  const [files, setFiles] = useState<File[]>([]);
  const { messages, loading, sendMessage, loadMore, hasMore } =
    useChatBot(sessionId);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastMessageRef = useRef<string | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (messages.length === 0) return;

    const lastMsg = messages[messages.length - 1];
    const lastMsgKey = lastMsg.id || lastMsg.createdAt;

    // 初回ロード、または新しいメッセージ(最後尾)が追加された場合のみスクロール
    if (lastMsgKey !== lastMessageRef.current) {
      scrollToBottom();
      lastMessageRef.current = lastMsgKey;
    }
  }, [messages]);

  const handleSend = async () => {
    if (input.trim() || files.length > 0) {
      const attachments: Attachment[] = [];

      // 添付ファイルのバイナリをBase64に変換してセット
      for (const file of files) {
        const buffer = await file.arrayBuffer();
        attachments.push({
          name: file.name,
          base64: fromByteArray(new Uint8Array(buffer)),
        });
      }

      sendMessage(input, attachments);
      setInput("");
      setFiles([]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputFiles = e.target.files;
    if (inputFiles) {
      const newFiles = Array.from(inputFiles);
      const allFiles = [...files, ...newFiles];
      const error = validateFiles(allFiles);
      if (error) {
        alert(error);
        return;
      }
      setFiles(allFiles);
    }
  };

  const handleRemoveFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
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
        {hasMore && (
          <Box sx={{ display: "flex", justifyContent: "center", mb: 2 }}>
            <Button size="small" onClick={loadMore}>
              過去のメッセージを読み込む
            </Button>
          </Box>
        )}
        {messages.map((msg, idx) => (
          <Box
            key={idx}
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

              {msg.role === "assistant" &&
                msg.traces &&
                msg.traces.length > 0 && <MessageTraces traces={msg.traces} />}
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

      {/* 選択されたファイルのプレビュー表示 */}
      {files.length > 0 && (
        <Box
          sx={{
            p: 1,
            px: 2,
            display: "flex",
            gap: 1,
            flexWrap: "wrap",
            borderTop: "1px solid #e0e0e0",
            bgcolor: "#fafafa",
          }}
        >
          {files.map((file, idx) => (
            <Chip
              key={idx}
              label={file.name}
              onDelete={() => handleRemoveFile(idx)}
              size="small"
              variant="outlined"
              color="primary"
              deleteIcon={<CloseIcon style={{ fontSize: 16 }} />}
            />
          ))}
        </Box>
      )}

      <Box
        sx={{
          p: 2,
          borderTop: "1px solid #e0e0e0",
          display: "flex",
          gap: 1,
          alignItems: "flex-end",
        }}
      >
        <input
          id="chat-file-attach"
          type="file"
          multiple
          hidden
          onChange={handleFileChange}
        />
        <Tooltip title="ドキュメントを添付">
          <IconButton
            component="label"
            htmlFor="chat-file-attach"
            color="primary"
            disabled={loading}
          >
            <AttachFileIcon />
          </IconButton>
        </Tooltip>
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
          disabled={loading || (!input.trim() && files.length === 0)}
        >
          <SendIcon />
        </IconButton>
      </Box>
    </>
  );
}
