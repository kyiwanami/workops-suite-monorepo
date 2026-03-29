import { useState } from "react";
import {
  Box,
  Button,
  Chip,
  MenuItem,
  Paper,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import AssignmentIcon from "@mui/icons-material/Assignment";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../shared/auth/useAuth";
import { Can } from "../../../shared/auth/ability";
import { useRequests } from "../hooks/useRequests";
import { useRequestTypes } from "../hooks/useRequestTypes";
import { REQUEST_STATUS_MAP, REQUEST_STATUS_CHIP_COLOR } from "../constants";
import { RequestFormDialog } from "./RequestForm";
import type { RequestStatusCode } from "../workflow";

export function RequestList() {
  const navigate = useNavigate();
  const { userInfo } = useAuth();
  const {
    requests: departmentRequests,
    loading: departmentRequestsLoading,
  } = useRequests(userInfo.departmentCode ?? "");
  const { requestTypes } = useRequestTypes();

  const [statusFilter, setStatusFilter] = useState<RequestStatusCode | "all">(
    "all",
  );
  const [openForm, setOpenForm] = useState(false);

  const requests = departmentRequests;
  const loading = departmentRequestsLoading;

  const filtered = requests.filter(
    (r) => statusFilter === "all" || r.status === statusFilter,
  );

  const requestTypeMap = new Map(requestTypes.map((rt) => [rt.id, rt.name]));

  const getStatusLabel = (status: RequestStatusCode): string =>
    REQUEST_STATUS_MAP[status] ?? status;

  const handleRowClick = (id: string) => {
    navigate(`/requests/${id}`);
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
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        mb={3}
      >
        <Typography variant="h5" fontWeight={600}>
          申請一覧
        </Typography>
        <Can I="create" a="Request">
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setOpenForm(true)}
            disableElevation
          >
            新規申請
          </Button>
        </Can>
      </Stack>

      <Paper
        elevation={0}
        sx={{
          border: "1px solid",
          borderColor: "divider",
          borderRadius: 2,
          overflow: "hidden",
          mb: 2,
        }}
      >
        <Box sx={{ p: 2 }}>
          <Select
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value as RequestStatusCode | "all")
            }
            size="small"
            sx={{ minWidth: 150 }}
          >
            <MenuItem value="all">すべての状態</MenuItem>
            <MenuItem value="draft">下書き</MenuItem>
            <MenuItem value="submitted">申請中</MenuItem>
            <MenuItem value="approved">承認済</MenuItem>
            <MenuItem value="rejected">却下</MenuItem>
            <MenuItem value="withdrawn">取下げ</MenuItem>
          </Select>
        </Box>
      </Paper>

      <Paper
        elevation={0}
        sx={{
          border: "1px solid",
          borderColor: "divider",
          borderRadius: 2,
          overflow: "hidden",
        }}
      >
        <TableContainer>
          <Table>
            <TableHead sx={{ bgcolor: "grey.50" }}>
              <TableRow>
                <TableCell>作成日</TableCell>
                <TableCell>ステータス</TableCell>
                <TableCell>申請種別</TableCell>
                <TableCell>タイトル</TableCell>
                <TableCell align="right">金額</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.map((request) => (
                <TableRow
                  key={request.id}
                  onClick={() => handleRowClick(request.id)}
                  sx={{
                    cursor: "pointer",
                    "&:hover": { bgcolor: "action.hover" },
                  }}
                >
                  <TableCell>
                    {request.createdAt
                      ? new Date(request.createdAt).toLocaleDateString("ja-JP")
                      : "-"}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={getStatusLabel(request.status)}
                      size="small"
                      color={REQUEST_STATUS_CHIP_COLOR[request.status]}
                      variant="filled"
                    />
                  </TableCell>
                  <TableCell>
                    {requestTypeMap.get(request.requestTypeId) ?? "-"}
                  </TableCell>
                  <TableCell>{request.title}</TableCell>
                  <TableCell align="right">
                    {request.amount.toLocaleString("ja-JP")}
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5}>
                    <Stack
                      alignItems="center"
                      spacing={1}
                      py={5}
                      color="text.secondary"
                    >
                      <AssignmentIcon sx={{ fontSize: 40, opacity: 0.3 }} />
                      <Typography variant="body2">申請がありません</Typography>
                    </Stack>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Can I="create" a="Request">
        <RequestFormDialog open={openForm} onClose={() => setOpenForm(false)} />
      </Can>
    </Box>
  );
}
