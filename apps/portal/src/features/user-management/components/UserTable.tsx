import { Visibility as VisibilityIcon } from "@mui/icons-material";
import {
  Box,
  Chip,
  CircularProgress,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { type CognitoUserType } from "../types";
import {
  userEnabledStatusToJapanese,
  userStatusToJapanese,
} from "../utils/userStatusMapper";

interface UserTableProps {
  users: CognitoUserType[];
  loading: boolean;
  onViewDetail: (username: string) => void;
}

export const UserTable = ({ users, loading, onViewDetail }: UserTableProps) => {
  const getStatusChipColor = (status: string) => {
    switch (status) {
      case "CONFIRMED":
        return "success";
      case "UNCONFIRMED":
        return "warning";
      case "ARCHIVED":
        return "error";
      default:
        return "default";
    }
  };

  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="200px"
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>ユーザー名</TableCell>
            <TableCell>メールアドレス</TableCell>
            <TableCell>ステータス</TableCell>
            <TableCell>アカウント状態</TableCell>
            <TableCell>作成日時</TableCell>
            <TableCell>詳細</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {users.map((user: CognitoUserType) => (
            <TableRow key={user.username}>
              <TableCell>
                <Typography variant="body2" fontWeight="medium">
                  {user.username}
                </Typography>
              </TableCell>
              <TableCell>{user.email || "-"}</TableCell>
              <TableCell>
                <Chip
                  label={userStatusToJapanese(user.status)}
                  color={getStatusChipColor(user.status || "UNKNOWN") as any}
                  size="small"
                />
              </TableCell>
              <TableCell>
                <Chip
                  label={userEnabledStatusToJapanese(user.enabled)}
                  color={user.enabled ? "success" : "error"}
                  size="small"
                />
              </TableCell>
              <TableCell>
                {user.createdDate
                  ? new Date(user.createdDate).toLocaleDateString("ja-JP")
                  : "-"}
              </TableCell>
              <TableCell>
                <IconButton
                  size="small"
                  onClick={() => onViewDetail(user.username)}
                  title="詳細表示"
                >
                  <VisibilityIcon />
                </IconButton>
              </TableCell>
            </TableRow>
          ))}
          {users.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} align="center">
                ユーザーが見つかりません
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
};
