import { useEffect, useState } from "react";
import {
  Box,
  Button,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  Typography,
} from "@mui/material";
import {
  AddOutlined as AddIcon,
  RefreshOutlined as RefreshIcon,
} from "@mui/icons-material";
import { DepartmentTable } from "./components/DepartmentTable";
import { CreateDepartmentModal } from "./components/CreateDepartmentModal";
import { useDepartmentManagement } from "./hooks/useDepartmentManagement";
import { type DepartmentType } from "./types";
import { Can } from "../../shared/auth/ability";

const DepartmentManagement = () => {
  const { departments, loading, fetchDepartments, deleteDepartment } =
    useDepartmentManagement();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editingDepartment, setEditingDepartment] =
    useState<DepartmentType | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DepartmentType | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchDepartments();
  }, [fetchDepartments]);

  const handleModalClose = (success?: boolean) => {
    setCreateModalOpen(false);
    setEditingDepartment(null);
    if (success) fetchDepartments();
  };

  const handleCreateRequest = () => {
    setEditingDepartment(null);
    setCreateModalOpen(true);
  };

  const handleEditRequest = (dept: DepartmentType) => {
    setEditingDepartment(dept);
    setCreateModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    const success = await deleteDepartment(deleteTarget.code);
    setIsDeleting(false);
    if (success) {
      setDeleteTarget(null);
      fetchDepartments();
    }
  };

  return (
    <Container maxWidth={false}>
      <Can I="manage" a="DepartmentManagement" passThrough>
        {(allowed) => (
          <Box sx={{ py: 4, px: { xs: 2, sm: 3 } }}>
            {/* ページヘッダー */}
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                mb: 4,
              }}
            >
              <Box>
                <Typography variant="h5" fontWeight={700} gutterBottom>
                  部署マスタ
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  業務アプリ共通の部署コード・部署名を管理します
                </Typography>
              </Box>
              <Box sx={{ display: "flex", gap: 1 }}>
                <Button
                  variant="outlined"
                  startIcon={<RefreshIcon />}
                  onClick={fetchDepartments}
                  disabled={loading}
                  sx={{ borderRadius: 2, textTransform: "none" }}
                >
                  更新
                </Button>
                {allowed && (
                  <Button
                    variant="contained"
                    disableElevation
                    startIcon={<AddIcon />}
                    onClick={handleCreateRequest}
                    sx={{ borderRadius: 2, textTransform: "none" }}
                  >
                    新規作成
                  </Button>
                )}
              </Box>
            </Box>

            {/* テーブル */}
            <DepartmentTable
              departments={departments}
              loading={loading}
              onDeleteRequest={setDeleteTarget}
              onEditRequest={handleEditRequest}
              canEdit={allowed}
              canDelete={allowed}
            />

            {/* 作成/編集モーダル */}
            {allowed && (
              <CreateDepartmentModal
                open={createModalOpen}
                onClose={handleModalClose}
                department={editingDepartment}
              />
            )}

            {/* 削除確認ダイアログ */}
            <Dialog
              open={allowed && !!deleteTarget}
              onClose={() => setDeleteTarget(null)}
              maxWidth="xs"
              fullWidth
              PaperProps={{ sx: { borderRadius: 3 } }}
            >
              <DialogTitle sx={{ pb: 1 }}>
                <Typography variant="h6" fontWeight={600}>
                  部署を削除しますか？
                </Typography>
              </DialogTitle>
              <Divider />
              <DialogContent sx={{ pt: 2.5 }}>
                <DialogContentText>
                  <strong>{deleteTarget?.name}</strong>（コード:{" "}
                  <code>{deleteTarget?.code}</code>）を削除します。
                  <br />
                  <br />
                  この操作は取り消せません。削除前に関連するCognitoグループのユーザーを移行してください。
                </DialogContentText>
              </DialogContent>
              <Divider />
              <DialogActions sx={{ px: 3, py: 2 }}>
                <Button
                  onClick={() => setDeleteTarget(null)}
                  color="inherit"
                  disabled={isDeleting}
                >
                  キャンセル
                </Button>
                <Button
                  onClick={handleDeleteConfirm}
                  variant="contained"
                  color="error"
                  disableElevation
                  disabled={isDeleting}
                  sx={{ borderRadius: 2, minWidth: 100 }}
                >
                  {isDeleting ? "削除中..." : "削除する"}
                </Button>
              </DialogActions>
            </Dialog>
          </Box>
        )}
      </Can>
    </Container>
  );
};

export default DepartmentManagement;
