import { useMemo, useState } from "react";
import {
  Box,
  Button,
  IconButton,
  InputAdornment,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import CategoryIcon from "@mui/icons-material/Category";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import SearchIcon from "@mui/icons-material/Search";
import { useAssetTypes } from "../hooks/useAssetTypes";
import { useAssetType, type AssetType } from "../hooks/useAssetType";
import { AssetTypeFormDialog } from "./AssetTypeFormDialog";
import { ConfirmDialog } from "../../../shared/components/ConfirmDialog";
import { useNotification } from "../../../shared/notification";
import { Can } from "../../../shared/auth/ability";

type DeleteTarget = {
  id: string;
  name: string;
};

export function AssetTypeList() {
  const { assetTypes, loading } = useAssetTypes();
  const { deleteAssetType } = useAssetType();
  const { showError, showSuccess } = useNotification();

  const [openForm, setOpenForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [codeFilter, setCodeFilter] = useState("");
  const [nameFilter, setNameFilter] = useState("");

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const sortedAndFilteredAssetTypes = useMemo(() => {
    const filtered = assetTypes.filter((assetType) => {
      const codeMatches =
        codeFilter === "" || assetType.code.includes(codeFilter);
      const nameMatches =
        nameFilter === "" || assetType.name.includes(nameFilter);

      return codeMatches && nameMatches;
    });

    filtered.sort((left, right) => {
      const leftOrder = left.sortOrder ?? Number.MAX_SAFE_INTEGER;
      const rightOrder = right.sortOrder ?? Number.MAX_SAFE_INTEGER;
      if (leftOrder !== rightOrder) {
        return leftOrder - rightOrder;
      }
      return left.name.localeCompare(right.name, "ja-JP");
    });

    return filtered;
  }, [assetTypes, codeFilter, nameFilter]);

  const currentItems = sortedAndFilteredAssetTypes.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

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
    if (!deleteTarget) {
      return;
    }

    setDeleteLoading(true);
    const deleted = await deleteAssetType(deleteTarget.id);
    setDeleteLoading(false);
    if (deleted) {
      showSuccess("資産種別を削除しました");
      setDeleteTarget(null);
      return;
    }
    showError("資産種別の削除に失敗しました");
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
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" fontWeight={700}>
          資産種別
        </Typography>
        <Can I="manage" a="AssetType">
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleOpenCreate}
          >
            新規登録
          </Button>
        </Can>
      </Stack>

      <Paper
        elevation={0}
        sx={{ p: 2, mb: 2, border: "1px solid", borderColor: "divider", borderRadius: 2 }}
      >
        <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
          <TextField
            label="コード"
            value={codeFilter}
            onChange={(event) => {
              setCodeFilter(event.target.value);
              setPage(0);
            }}
            fullWidth
            size="small"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" color="action" />
                </InputAdornment>
              ),
            }}
          />
          <TextField
            label="名称"
            value={nameFilter}
            onChange={(event) => {
              setNameFilter(event.target.value);
              setPage(0);
            }}
            fullWidth
            size="small"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" color="action" />
                </InputAdornment>
              ),
            }}
          />
        </Stack>
      </Paper>

      <Paper
        elevation={0}
        sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2, overflow: "hidden" }}
      >
        <TableContainer>
          <Table>
            <TableHead sx={{ bgcolor: "grey.50" }}>
              <TableRow>
                <TableCell>コード</TableCell>
                <TableCell>名称</TableCell>
                <TableCell>説明</TableCell>
                <TableCell>表示順</TableCell>
                <TableCell align="right">操作</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {currentItems.map((assetType: AssetType) => (
                <TableRow
                  key={assetType.id}
                  sx={{ "&:hover": { bgcolor: "action.hover" }, cursor: "default" }}
                >
                  <TableCell>
                    <Typography variant="body2" fontFamily="monospace" color="text.secondary">
                      {assetType.code}
                    </Typography>
                  </TableCell>
                  <TableCell>{assetType.name}</TableCell>
                  <TableCell>{assetType.description ?? "-"}</TableCell>
                  <TableCell>{assetType.sortOrder ?? "-"}</TableCell>
                  <TableCell align="right">
                    <Can I="manage" a="AssetType">
                      <Tooltip title="編集">
                        <IconButton size="small" onClick={() => handleOpenEdit(assetType.id)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Can>
                    <Can I="manage" a="AssetType">
                      <Tooltip title="削除">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() =>
                            setDeleteTarget({
                              id: assetType.id,
                              name: assetType.name,
                            })
                          }
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Can>
                  </TableCell>
                </TableRow>
              ))}
              {sortedAndFilteredAssetTypes.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5}>
                    <Stack alignItems="center" spacing={1} py={4} color="text.secondary">
                      <CategoryIcon sx={{ fontSize: 40, opacity: 0.4 }} />
                      <Typography variant="body2">資産種別データがありません</Typography>
                    </Stack>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          component="div"
          count={sortedAndFilteredAssetTypes.length}
          page={page}
          onPageChange={(_event, newPage) => setPage(newPage)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(event) => {
            setRowsPerPage(parseInt(event.target.value, 10));
            setPage(0);
          }}
          rowsPerPageOptions={[5, 10, 25, 50]}
          labelRowsPerPage="表示件数"
          labelDisplayedRows={({ from, to, count }) => `${from}–${to} / ${count}件`}
        />
      </Paper>

      <Can I="manage" a="AssetType">
        <AssetTypeFormDialog open={openForm} onClose={handleCloseForm} id={editId} />
      </Can>

      <Can I="manage" a="AssetType" passThrough>
        {(allowed) => (
          <ConfirmDialog
            open={allowed && deleteTarget !== null}
            title="資産種別を削除しますか？"
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
