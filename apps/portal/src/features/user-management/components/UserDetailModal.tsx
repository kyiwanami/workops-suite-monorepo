import {
  Box,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  Grid,
  Stack,
  Chip,
  Tooltip,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  CircularProgress,
} from "@mui/material";
import { Delete as DeleteIcon } from "@mui/icons-material";
import { useState, useEffect, useCallback } from "react";
import { useUserManagement } from "../hooks/useUserManagement";
import {
  userStatusToJapanese,
  userEnabledStatusToJapanese,
} from "../utils/userStatusMapper";
import { type UserDetailType, type CognitoGroupType } from "../types";

/** グループ名が {DeptCode}_{ROLE} 形式か判定 */
const isDeptRoleGroup = (groupName: string): boolean =>
  /^[A-Z0-9]+_(viewer|editor|manager)$/.test(groupName);

/** admin グループか判定 */
const isAdminsGroup = (groupName: string): boolean => groupName === "admin";

interface UserDetailModalProps {
  open: boolean;
  onClose: (refresh?: boolean) => void;
  user: UserDetailType | null;
}

export const UserDetailModal = ({
  open,
  onClose,
  user,
}: UserDetailModalProps) => {
  const {
    setUserEnabled,
    deleteUser,
    fetchGroupsForUser,
    fetchAllGroups,
    assignUserGroup,
  } = useUserManagement();
  const [statusChangeConfirmOpen, setStatusChangeConfirmOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  // グループ管理 state
  const [userGroups, setUserGroups] = useState<CognitoGroupType[]>([]);
  const [allGroups, setAllGroups] = useState<CognitoGroupType[]>([]);
  const [selectedGroup, setSelectedGroup] = useState("");
  const [groupsLoading, setGroupsLoading] = useState(false);

  // 現在の dept+role グループを導出
  const currentDeptGroup =
    userGroups.find(
      (g) => isDeptRoleGroup(g.groupName) || isAdminsGroup(g.groupName)
    )?.groupName ?? null;

  const loadGroups = useCallback(async () => {
    if (!user) return;
    setGroupsLoading(true);
    const [groups, all] = await Promise.all([
      fetchGroupsForUser(user.username),
      fetchAllGroups(),
    ]);
    setUserGroups(groups);
    setAllGroups(all);
    const current = groups.find(
      (g) => isDeptRoleGroup(g.groupName) || isAdminsGroup(g.groupName)
    );
    setSelectedGroup(current?.groupName ?? "");
    setGroupsLoading(false);
  }, [user, fetchGroupsForUser, fetchAllGroups]);

  useEffect(() => {
    if (open && user) {
      loadGroups();
    }
  }, [open, user, loadGroups]);

  if (!user) return null;

  const handleStatusChange = async (enable: boolean) => {
    const success = await setUserEnabled({
      username: user.username,
      enabled: enable,
    });
    if (success) {
      setStatusChangeConfirmOpen(false);
      onClose(true);
    }
  };

  const handleDeleteUser = async () => {
    const success = await deleteUser({ username: user.username });
    if (success) {
      setDeleteConfirmOpen(false);
      onClose(true);
    }
  };

  const handleGroupAssign = async () => {
    if (!selectedGroup || selectedGroup === currentDeptGroup) return;
    const success = await assignUserGroup(
      user.username,
      selectedGroup,
      currentDeptGroup
    );
    if (success) {
      await loadGroups();
    }
  };

  return (
    <Dialog open={open} onClose={() => onClose()} maxWidth="md" fullWidth>
      <DialogTitle>ユーザー詳細</DialogTitle>
      <DialogContent>
        <Box>
          <Typography variant="h6" gutterBottom>
            基本情報
          </Typography>
          <Box
            sx={{
              mb: 3,
              p: 2,
              bgcolor: "background.paper",
              borderRadius: 1,
              border: "1px solid",
              borderColor: "divider",
            }}
          >
            <Grid container spacing={2}>
              <Grid sx={{ xs: 12, md: 6 }}>
                <Typography sx={{ mb: 1 }}>
                  <strong>ユーザー名:</strong> {user.username}
                </Typography>
                <Typography component="div" sx={{ mb: 1 }}>
                  <strong>ステータス:</strong>
                  <Chip
                    label={userStatusToJapanese(user.status)}
                    size="small"
                    color={user.status === "CONFIRMED" ? "success" : "warning"}
                    sx={{ ml: 1 }}
                  />
                </Typography>
                <Typography component="div" sx={{ mb: 1 }}>
                  <strong>アカウント状態:</strong>
                  <Chip
                    label={userEnabledStatusToJapanese(user.enabled)}
                    size="small"
                    color={user.enabled ? "success" : "error"}
                    sx={{ ml: 1 }}
                  />
                </Typography>
              </Grid>
              <Grid sx={{ xs: 12, md: 6 }}>
                <Typography sx={{ mb: 1 }}>
                  <strong>作成日時:</strong>{" "}
                  {user.createdDate
                    ? new Date(user.createdDate).toLocaleString("ja-JP")
                    : "-"}
                </Typography>
                <Typography sx={{ mb: 1 }}>
                  <strong>更新日時:</strong>{" "}
                  {user.lastModifiedDate
                    ? new Date(user.lastModifiedDate).toLocaleString("ja-JP")
                    : "-"}
                </Typography>
              </Grid>
            </Grid>
          </Box>

          <Typography variant="h6" gutterBottom>
            グループ設定
          </Typography>
          <Box
            sx={{
              p: 2,
              bgcolor: "background.paper",
              borderRadius: 1,
              border: "1px solid",
              borderColor: "divider",
            }}
          >
            {groupsLoading ? (
              <Box sx={{ display: "flex", justifyContent: "center", py: 2 }}>
                <CircularProgress size={24} />
              </Box>
            ) : (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <Box>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    <strong>現在のグループ:</strong>
                  </Typography>
                  {currentDeptGroup ? (
                    <Chip
                      label={currentDeptGroup}
                      color="primary"
                      size="small"
                    />
                  ) : (
                    <Chip
                      label="未割当"
                      color="warning"
                      variant="outlined"
                      size="small"
                    />
                  )}
                </Box>

                <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
                  <FormControl size="small" sx={{ flex: 1 }}>
                    <InputLabel>グループを選択</InputLabel>
                    <Select
                      value={selectedGroup}
                      label="グループを選択"
                      onChange={(e) => setSelectedGroup(e.target.value)}
                    >
                      {allGroups.map((group) => (
                        <MenuItem
                          key={group.groupName}
                          value={group.groupName}
                        >
                          {group.groupName}
                        </MenuItem>
                      ))}
                      {allGroups.length === 0 && (
                        <MenuItem disabled>グループが存在しません</MenuItem>
                      )}
                    </Select>
                  </FormControl>
                  <Button
                    variant="outlined"
                    onClick={handleGroupAssign}
                    disabled={
                      !selectedGroup || selectedGroup === currentDeptGroup
                    }
                  >
                    変更する
                  </Button>
                </Box>
              </Box>
            )}
          </Box>
        </Box>
      </DialogContent>
      <DialogActions>
        <Stack
          direction="row"
          spacing={2}
          sx={{ flexGrow: 1, justifyContent: "flex-start" }}
        >
          {user.enabled ? (
            <Button
              variant="outlined"
              color="primary"
              onClick={() => setStatusChangeConfirmOpen(true)}
            >
              アカウントを無効にする
            </Button>
          ) : (
            <Button
              variant="outlined"
              color="success"
              onClick={() => handleStatusChange(true)}
            >
              アカウントを有効にする
            </Button>
          )}

          {user.enabled ? (
            <Tooltip
              title="アカウントを無効にしてから削除してください"
              placement="top"
              arrow
            >
              <span>
                <Button
                  variant="outlined"
                  color="error"
                  startIcon={<DeleteIcon />}
                  disabled
                >
                  削除
                </Button>
              </span>
            </Tooltip>
          ) : (
            <Button
              variant="outlined"
              color="error"
              startIcon={<DeleteIcon />}
              onClick={() => setDeleteConfirmOpen(true)}
            >
              削除
            </Button>
          )}
        </Stack>
        <Button onClick={() => onClose()}>閉じる</Button>
      </DialogActions>

      {/* ステータス変更確認ダイアログ */}
      <Dialog
        open={statusChangeConfirmOpen}
        onClose={() => setStatusChangeConfirmOpen(false)}
      >
        <DialogTitle>アカウントを無効にしますか？</DialogTitle>
        <DialogContent>
          <DialogContentText>
            ユーザー「{user.username}
            」のアカウントを無効にすると、このユーザーはログインできなくなります。
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setStatusChangeConfirmOpen(false)}>
            キャンセル
          </Button>
          <Button
            onClick={() => handleStatusChange(false)}
            variant="contained"
            color="primary"
            autoFocus
          >
            無効にする
          </Button>
        </DialogActions>
      </Dialog>

      {/* 削除確認ダイアログ */}
      <Dialog
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
      >
        <DialogTitle>アカウント削除の確認</DialogTitle>
        <DialogContent>
          <DialogContentText>
            ユーザー「{user.username}
            」のアカウントを削除しますか？この操作は取り消せません。
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmOpen(false)}>
            キャンセル
          </Button>
          <Button
            onClick={handleDeleteUser}
            variant="contained"
            color="error"
            autoFocus
          >
            削除する
          </Button>
        </DialogActions>
      </Dialog>
    </Dialog>
  );
};
