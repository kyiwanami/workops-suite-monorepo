import { useState } from "react";
import {
  alpha,
  Box,
  Button,
  Chip,
  IconButton,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import CategoryIcon from "@mui/icons-material/Category";
import {
  useRequestTypes,
  useRequestType,
  type RequestType,
} from "../hooks/useRequestTypes";
import { RequestTypeFormDialog } from "./RequestTypeFormDialog";
import { ConfirmDialog } from "../../../shared/components/ConfirmDialog";
import { useNotification } from "../../../shared/notification";
import { Can } from "../../../shared/auth/ability";

export function RequestTypeList() {
  const { requestTypes, loading } = useRequestTypes();
  const { deleteRequestType } = useRequestType();
  const { showError, showSuccess } = useNotification();

  const [openForm, setOpenForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<RequestType | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const handleOpenCreate = () => {
    setEditId(null);
    setOpenForm(true);
  };

  const handleOpenEdit = (id: string) => {
    setEditId(id);
    setOpenForm(true);
  };

  const handleCloseForm = () => {
    setOpenForm(false);
    setEditId(null);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    const deleted = await deleteRequestType(deleteTarget.id);
    setDeleteLoading(false);
    if (deleted) {
      showSuccess("申請種別を削除しました");
      setDeleteTarget(null);
      return;
    }
    showError("申請種別の削除に失敗しました");
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
        <Typography color="text.secondary">読み込み中...</Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "flex-start", sm: "center" }}
        spacing={2}
        mb={3}
        sx={{
          p: 3,
          borderRadius: 4,
          background: (theme) =>
            `linear-gradient(135deg, ${alpha(theme.palette.primary.light, 0.18)} 0%, ${alpha(theme.palette.background.paper, 0.95)} 55%)`,
          border: "1px solid",
          borderColor: "divider",
        }}
      >
        {/* 管理画面の目的を最初に明示して操作意図を揃える */}
        <Box>
          <Typography variant="h5" fontWeight={700}>
            申請種別管理
          </Typography>
          <Typography variant="body2" color="text.secondary" mt={0.5}>
            申請フォームで利用する種別を追加・編集・削除します
          </Typography>
        </Box>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Chip
            size="small"
            color="primary"
            variant="outlined"
            label={`登録数: ${requestTypes.length}`}
          />
        </Stack>
        <Can I="manage" a="RequestType">
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleOpenCreate}
            disableElevation
            sx={{
              borderRadius: 999,
              px: 2.5,
              fontWeight: 600,
            }}
          >
            追加
          </Button>
        </Can>
      </Stack>

      <Paper
        elevation={0}
        sx={{
          border: "1px solid",
          borderColor: "divider",
          borderRadius: 4,
          overflow: "hidden",
          backdropFilter: "blur(8px)",
        }}
      >
        <TableContainer>
          <Table>
            <TableHead
              sx={{
                bgcolor: (theme) => alpha(theme.palette.grey[200], 0.45),
              }}
            >
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>コード</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>名称</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>説明</TableCell>
                <TableCell align="center" sx={{ fontWeight: 700 }}>
                  表示順
                </TableCell>
                <TableCell align="center" sx={{ fontWeight: 700 }}>
                  状態
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>
                  操作
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {requestTypes.map((rt) => (
                <TableRow
                  key={rt.id}
                  sx={{
                    "&:hover": {
                      bgcolor: (theme) => alpha(theme.palette.primary.light, 0.08),
                    },
                    transition: "background-color 120ms ease",
                  }}
                >
                  <TableCell>
                    <Typography
                      variant="body2"
                      fontFamily="'IBM Plex Mono', 'SFMono-Regular', Consolas, monospace"
                      fontWeight={600}
                    >
                      {rt.code}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight={600}>
                      {rt.name}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{
                        maxWidth: 360,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {rt.description ?? "-"}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Typography variant="body2" color="text.secondary">
                      {rt.sortOrder ?? "-"}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Chip
                      size="small"
                      color={rt.isActive ? "success" : "default"}
                      variant={rt.isActive ? "filled" : "outlined"}
                      label={rt.isActive ? "有効" : "無効"}
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Can I="manage" a="RequestType">
                      <Tooltip title="編集">
                        <IconButton
                          size="small"
                          onClick={() => handleOpenEdit(rt.id)}
                          sx={{ mr: 0.5 }}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Can>
                    <Can I="manage" a="RequestType">
                      <Tooltip title="削除">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => setDeleteTarget(rt)}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Can>
                  </TableCell>
                </TableRow>
              ))}
              {requestTypes.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6}>
                    <Stack
                      alignItems="center"
                      spacing={1}
                      py={7}
                      color="text.secondary"
                    >
                      <CategoryIcon sx={{ fontSize: 44, opacity: 0.4 }} />
                      <Typography variant="body2">
                        申請種別が登録されていません
                      </Typography>
                      <Can I="manage" a="RequestType">
                        <Button
                          onClick={handleOpenCreate}
                          size="small"
                          variant="outlined"
                          sx={{ mt: 1, borderRadius: 999 }}
                        >
                          最初の種別を追加
                        </Button>
                      </Can>
                    </Stack>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Can I="manage" a="RequestType">
        <RequestTypeFormDialog
          open={openForm}
          onClose={handleCloseForm}
          id={editId}
        />
      </Can>

      <Can I="manage" a="RequestType" passThrough>
        {(allowed) => (
          <ConfirmDialog
            open={allowed && deleteTarget !== null}
            title="申請種別を削除しますか？"
            message={`「${deleteTarget?.name ?? ""}」を削除します。この操作は取り消せません。`}
            onConfirm={handleDeleteConfirm}
            onCancel={() => setDeleteTarget(null)}
            loading={deleteLoading}
          />
        )}
      </Can>
    </Box>
  );
}
