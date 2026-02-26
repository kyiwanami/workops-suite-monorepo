import { useState, useEffect, useMemo } from "react";
import { Box, Button, Grid, Paper, TextField, Typography } from "@mui/material";
import {
  Add as AddIcon,
  Refresh as RefreshIcon,
  Clear as ClearIcon,
} from "@mui/icons-material";
import { useUserManagement } from "../hooks/useUserManagement";
import { UserTable } from "./UserTable";
import { CreateUserModal } from "./CreateUserModal";
import { UserDetailModal } from "./UserDetailModal";
import { type UserDetailType } from "../types";
import { Can } from "../../../shared/auth/ability";

export const UserList = () => {
  const { users, loading, fetchUsers, fetchUserDetail } = useUserManagement();

  // 状態管理
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserDetailType | null>(null);

  // 検索フォーム
  const [searchUsername, setSearchUsername] = useState("");
  const [searchEmail, setSearchEmail] = useState("");

  // フィルタリングされたユーザーリスト
  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const matchUsername = user.username
        .toLowerCase()
        .includes(searchUsername.toLowerCase());
      const matchEmail =
        !searchEmail ||
        (user.email &&
          user.email.toLowerCase().includes(searchEmail.toLowerCase()));
      return matchUsername && matchEmail;
    });
  }, [users, searchUsername, searchEmail]);

  // 初回ロード
  useEffect(() => {
    fetchUsers();
  }, []);

  const handleRefresh = () => {
    fetchUsers();
  };

  const handleCreateClose = (success?: boolean) => {
    setCreateModalOpen(false);
    if (success) {
      fetchUsers();
    }
  };

  const handleViewDetail = async (username: string) => {
    const detail = await fetchUserDetail(username);
    if (detail) {
      setSelectedUser(detail);
      setDetailModalOpen(true);
    }
  };

  const handleDetailClose = (refresh?: boolean) => {
    setDetailModalOpen(false);
    setSelectedUser(null);
    if (refresh) {
      fetchUsers();
    }
  };

  const handleClearSearch = () => {
    setSearchUsername("");
    setSearchEmail("");
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 3,
        }}
      >
        <Typography variant="h5" component="h1">
          ユーザー管理
        </Typography>
        <Box>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={handleRefresh}
            sx={{ mr: 1 }}
          >
            更新
          </Button>
          <Can I="manage" a="UserManagement">
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setCreateModalOpen(true)}
            >
              新規作成
            </Button>
          </Can>
        </Box>
      </Box>

      {/* 検索フォーム */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid sx={{ xs: 12, md: 4 }}>
            <TextField
              label="ユーザー名"
              variant="outlined"
              size="small"
              fullWidth
              value={searchUsername}
              onChange={(e) => setSearchUsername(e.target.value)}
              placeholder="部分一致検索"
            />
          </Grid>
          <Grid sx={{ xs: 12, md: 4 }}>
            <TextField
              label="メールアドレス"
              variant="outlined"
              size="small"
              fullWidth
              value={searchEmail}
              onChange={(e) => setSearchEmail(e.target.value)}
              placeholder="部分一致検索"
            />
          </Grid>
          <Grid sx={{ xs: 12, md: 4 }}>
            <Box sx={{ display: "flex", gap: 1 }}>
              <Button
                variant="outlined"
                color="secondary"
                startIcon={<ClearIcon />}
                onClick={handleClearSearch}
                disabled={!searchUsername && !searchEmail}
              >
                クリア
              </Button>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* ユーザー一覧 */}
      <UserTable
        users={filteredUsers}
        loading={loading}
        onViewDetail={handleViewDetail}
      />

      {/* モーダル */}
      <Can I="manage" a="UserManagement">
        <CreateUserModal open={createModalOpen} onClose={handleCreateClose} />
      </Can>

      <UserDetailModal
        open={detailModalOpen}
        onClose={handleDetailClose}
        user={selectedUser}
      />
    </Box>
  );
};
