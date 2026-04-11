import { useMemo, useState } from "react";
import {
  Box,
  Button,
  Chip,
  IconButton,
  InputAdornment,
  MenuItem,
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
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import VisibilityIcon from "@mui/icons-material/Visibility";
import SearchIcon from "@mui/icons-material/Search";
import Inventory2Icon from "@mui/icons-material/Inventory2";
import { useAbility } from "@casl/react";
import { useNavigate } from "react-router-dom";
import { useAssets, useAsset, type Asset } from "../hooks/useAssets";
import { useAssetTypes } from "../hooks/useAssetTypes";
import { ASSET_STATUS_MAP, ASSET_STATUS_CHIP_COLOR } from "../constants";
import { AssetFormDialog } from "./AssetFormDialog";
import { ConfirmDialog } from "../../../shared/components/ConfirmDialog";
import { useNotification } from "@workops-suite/shared-notification";
import { Can, AbilityContext } from "../../../shared/auth/ability";

export function AssetList() {
  const navigate = useNavigate();
  const { showError, showSuccess } = useNotification();
  const ability = useAbility(AbilityContext);
  const { assets, loading } = useAssets();
  const { assetTypes } = useAssetTypes();
  const { deleteAsset } = useAsset();

  const [openForm, setOpenForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Asset | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [departmentFilter, setDepartmentFilter] = useState("");
  const [nameFilter, setNameFilter] = useState("");
  const [assigneeFilter, setAssigneeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [assetTypeFilter, setAssetTypeFilter] = useState("");

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const canCreateAsset = ability.can("create", "Asset");
  const canUpdateAsset = ability.can("update", "Asset");
  const canDeleteAsset = ability.can("delete", "Asset");

  const assetTypeMap = useMemo(
    () => new Map(assetTypes.map((assetType) => [assetType.id, assetType.name])),
    [assetTypes]
  );

  const sortedAndFilteredAssets = useMemo(() => {
    const normalizedDepartmentFilter = departmentFilter.trim().toLowerCase();
    const normalizedNameFilter = nameFilter.toLowerCase();
    const normalizedAssigneeFilter = assigneeFilter.trim().toLowerCase();

    const filtered = assets.filter((asset) => {
      const departmentMatches =
        !ability.can("read", "Department") ||
        normalizedDepartmentFilter === "" ||
        asset.departmentId.toLowerCase().includes(normalizedDepartmentFilter);

      const nameMatches =
        normalizedNameFilter === "" ||
        asset.name.toLowerCase().includes(normalizedNameFilter);

      const assigneeValue = (asset.assigneeSub ?? "").toLowerCase();
      const assigneeMatches =
        normalizedAssigneeFilter === "" ||
        assigneeValue.includes(normalizedAssigneeFilter);

      const statusMatches = statusFilter === "" || asset.status === statusFilter;
      const assetTypeMatches =
        assetTypeFilter === "" || asset.assetTypeId === assetTypeFilter;

      return (
        departmentMatches &&
        nameMatches &&
        assigneeMatches &&
        statusMatches &&
        assetTypeMatches
      );
    });

    filtered.sort((left, right) => {
      const leftTime = left.createdAt ? new Date(left.createdAt).getTime() : 0;
      const rightTime = right.createdAt ? new Date(right.createdAt).getTime() : 0;
      return rightTime - leftTime;
    });

    return filtered;
  }, [assets, departmentFilter, nameFilter, assigneeFilter, statusFilter, assetTypeFilter]);

  const currentItems = sortedAndFilteredAssets.slice(
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
    const deleted = await deleteAsset(deleteTarget.id);
    setDeleteLoading(false);
    if (deleted) {
      showSuccess("資産を削除しました");
      setDeleteTarget(null);
      return;
    }
    showError("資産の削除に失敗しました");
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
          資産一覧
        </Typography>
        <Can I="create" a="Asset">
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
          <Can I="read" a="Department">
            <TextField
              label="部署"
              value={departmentFilter}
              onChange={(event) => {
                setDepartmentFilter(event.target.value);
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
          </Can>
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
          <TextField
            label="利用者"
            value={assigneeFilter}
            onChange={(event) => {
              setAssigneeFilter(event.target.value);
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
            select
            label="状態"
            value={statusFilter}
            onChange={(event) => {
              setStatusFilter(event.target.value);
              setPage(0);
            }}
            fullWidth
            size="small"
          >
            <MenuItem value="">すべて</MenuItem>
            {Object.entries(ASSET_STATUS_MAP).map(([value, label]) => (
              <MenuItem key={value} value={value}>
                {label}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            label="資産種別"
            value={assetTypeFilter}
            onChange={(event) => {
              setAssetTypeFilter(event.target.value);
              setPage(0);
            }}
            fullWidth
            size="small"
          >
            <MenuItem value="">すべて</MenuItem>
            {assetTypes.map((assetType) => (
              <MenuItem key={assetType.id} value={assetType.id}>
                {assetType.name}
              </MenuItem>
            ))}
          </TextField>
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
                <TableCell>ID</TableCell>
                <TableCell>名称</TableCell>
                <TableCell>部署</TableCell>
                <TableCell>利用者</TableCell>
                <TableCell>状態</TableCell>
                <TableCell>資産種別</TableCell>
                <TableCell>作成日時</TableCell>
                <TableCell align="right">操作</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {currentItems.map((asset: Asset) => (
                <TableRow
                  key={asset.id}
                  sx={{ "&:hover": { bgcolor: "action.hover" }, cursor: "default" }}
                >
                  <TableCell>
                    <Typography variant="body2" color="text.secondary" fontFamily="monospace">
                      {asset.id.slice(0, 8)}…
                    </Typography>
                  </TableCell>
                  <TableCell>{asset.name}</TableCell>
                  <TableCell>{asset.departmentId}</TableCell>
                  <TableCell>{asset.assigneeSub ?? "-"}</TableCell>
                  <TableCell>
                    <Chip
                      label={ASSET_STATUS_MAP[asset.status]}
                      color={ASSET_STATUS_CHIP_COLOR[asset.status]}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    {assetTypeMap.get(asset.assetTypeId) ?? asset.assetTypeId}
                  </TableCell>
                  <TableCell>
                    {asset.createdAt
                      ? new Date(asset.createdAt).toLocaleString("ja-JP")
                      : "-"}
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title="詳細">
                      <IconButton size="small" onClick={() => navigate(`/assets/${asset.id}`)}>
                        <VisibilityIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Can I="update" a="Asset">
                      <Tooltip title="編集">
                        <IconButton size="small" onClick={() => handleOpenEdit(asset.id)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Can>
                    <Can I="delete" a="Asset">
                      <Tooltip title="削除">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => setDeleteTarget(asset)}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Can>
                  </TableCell>
                </TableRow>
              ))}
              {sortedAndFilteredAssets.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8}>
                    <Stack alignItems="center" spacing={1} py={4} color="text.secondary">
                      <Inventory2Icon sx={{ fontSize: 40, opacity: 0.4 }} />
                      <Typography variant="body2">資産データがありません</Typography>
                    </Stack>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          component="div"
          count={sortedAndFilteredAssets.length}
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

      {(canCreateAsset || canUpdateAsset) && (
        <AssetFormDialog open={openForm} onClose={handleCloseForm} id={editId} />
      )}

      <ConfirmDialog
        open={canDeleteAsset && deleteTarget !== null}
        title="資産を削除しますか？"
        message="この操作は取り消せません。本当に削除してもよろしいですか？"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
        loading={deleteLoading}
      />
    </Box>
  );
}
