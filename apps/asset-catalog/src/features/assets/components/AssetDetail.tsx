import { useState } from "react";
import {
  Box,
  Breadcrumbs,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Grid,
  Link,
  Stack,
  Typography,
} from "@mui/material";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import { useNavigate, useParams } from "react-router-dom";
import { useAsset } from "../hooks/useAssets";
import { useAssetTypes } from "../hooks/useAssetTypes";
import { ASSET_STATUS_MAP, ASSET_STATUS_CHIP_COLOR } from "../constants";
import { AssetFormDialog } from "./AssetFormDialog";
import { ConfirmDialog } from "../../../shared/components/ConfirmDialog";
import { useNotification } from "@workops-suite/shared-notification";
import { Can } from "../../../shared/auth/ability";

function FieldItem({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Box>
      <Typography variant="caption" color="text.secondary" fontWeight={600} letterSpacing={0.5}>
        {label}
      </Typography>
      <Box mt={0.5}>{children}</Box>
    </Box>
  );
}

function DateField({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <FieldItem label={label}>
      <Stack direction="row" alignItems="center" spacing={0.5}>
        <CalendarTodayIcon fontSize="small" sx={{ color: "text.secondary", fontSize: 14 }} />
        <Typography variant="body2">
          {value ? new Date(value).toLocaleString("ja-JP") : "-"}
        </Typography>
      </Stack>
    </FieldItem>
  );
}

export function AssetDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showError, showSuccess } = useNotification();
  const { asset, loading, deleteAsset } = useAsset(id);
  const { assetTypes } = useAssetTypes();
  const [openForm, setOpenForm] = useState(false);
  const [openConfirm, setOpenConfirm] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const assetTypeMap = new Map(assetTypes.map((assetType) => [assetType.id, assetType.name]));

  const handleDeleteConfirm = async () => {
    if (!id) {
      return;
    }
    setDeleteLoading(true);
    const deleted = await deleteAsset(id);
    setDeleteLoading(false);
    if (deleted) {
      showSuccess("資産を削除しました");
      navigate("/assets");
      return;
    }
    showError("資産の削除に失敗しました");
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!asset) {
    return (
      <Box sx={{ py: 4 }}>
        <Typography color="text.secondary" mb={2}>
          データが見つかりません
        </Typography>
        <Link component="button" onClick={() => navigate("/assets")} underline="hover">
          資産一覧に戻る
        </Link>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 800 }}>
      <Breadcrumbs sx={{ mb: 2 }}>
        <Link
          component="button"
          underline="hover"
          color="inherit"
          onClick={() => navigate("/assets")}
          sx={{ cursor: "pointer" }}
        >
          資産一覧
        </Link>
        <Typography color="text.primary">資産詳細</Typography>
      </Breadcrumbs>

      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" fontWeight={700}>
          資産詳細
        </Typography>
        <Stack direction="row" spacing={1}>
          <Can I="update" a="Asset">
            <Button variant="outlined" onClick={() => setOpenForm(true)}>
              編集
            </Button>
          </Can>
          <Can I="delete" a="Asset">
            <Button variant="outlined" color="error" onClick={() => setOpenConfirm(true)}>
              削除
            </Button>
          </Can>
        </Stack>
      </Stack>

      <Card
        elevation={0}
        sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2 }}
      >
        <CardContent sx={{ p: 3 }}>
          <Grid container spacing={3}>
            <Grid size={{ xs: 12 }}>
              <FieldItem label="資産ID">
                <Typography variant="body2" fontFamily="monospace" color="text.secondary">
                  {asset.id}
                </Typography>
              </FieldItem>
            </Grid>

            <Grid size={{ xs: 12 }}>
              <FieldItem label="名称">
                <Typography variant="body1">{asset.name}</Typography>
              </FieldItem>
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <FieldItem label="部署コード">
                <Typography variant="body1">{asset.departmentId}</Typography>
              </FieldItem>
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <FieldItem label="利用者Sub">
                <Typography variant="body1">{asset.assigneeSub ?? "-"}</Typography>
              </FieldItem>
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <FieldItem label="状態">
                <Chip
                  label={ASSET_STATUS_MAP[asset.status]}
                  color={ASSET_STATUS_CHIP_COLOR[asset.status]}
                  size="small"
                />
              </FieldItem>
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <FieldItem label="資産種別">
                <Typography variant="body1">
                  {assetTypeMap.get(asset.assetTypeId) ?? asset.assetTypeId}
                </Typography>
              </FieldItem>
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <DateField label="作成日時" value={asset.createdAt} />
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <DateField label="更新日時" value={asset.updatedAt} />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Box mt={3}>
        <Button variant="text" onClick={() => navigate("/assets")}>
          ← 一覧に戻る
        </Button>
      </Box>

      <Can I="update" a="Asset">
        <AssetFormDialog open={openForm} onClose={() => setOpenForm(false)} id={id} />
      </Can>

      <Can I="delete" a="Asset" passThrough>
        {(allowed) => (
          <ConfirmDialog
            open={allowed && openConfirm}
            title="資産を削除しますか？"
            message="この操作は取り消せません。本当に削除してもよろしいですか？"
            onConfirm={handleDeleteConfirm}
            onCancel={() => setOpenConfirm(false)}
            loading={deleteLoading}
          />
        )}
      </Can>
    </Box>
  );
}
