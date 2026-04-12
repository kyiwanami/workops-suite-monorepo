import { useEffect, useState } from "react";
import {
  Box,
  Button,
  Chip,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  SelectChangeEvent,
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
import { useAuth } from "@workops-suite/shared-auth";
import { useDepartments } from "@workops-suite/shared-department";
import { Can } from "../../../shared/auth/ability";
import { useRequests } from "../hooks/useRequests";
import { useRequestTypes } from "../hooks/useRequestTypes";
import { REQUEST_STATUS_MAP, REQUEST_STATUS_CHIP_COLOR } from "../constants";
import { RequestFormDialog } from "./RequestForm";
import type { RequestStatusCode } from "../workflow";

const REQUEST_STATUS_OPTIONS: { value: RequestStatusCode | "all"; label: string }[] = [
  { value: "all", label: "すべての状態" },
  { value: "draft", label: "下書き" },
  { value: "submitted", label: "申請中" },
  { value: "approved", label: "承認済" },
  { value: "rejected", label: "却下" },
  { value: "withdrawn", label: "取下げ" },
];

// Select の文字列値を申請状態型へ閉じ込めて扱い、一覧フィルタの型を崩さない。
const isRequestStatusFilter = (
  value: string,
): value is RequestStatusCode | "all" => {
  return REQUEST_STATUS_OPTIONS.some((option) => option.value === value);
};

export function RequestList() {
  const navigate = useNavigate();
  const { userInfo } = useAuth();
  const { departments, loading: departmentsLoading } = useDepartments();
  const initialDepartmentId = userInfo.departmentCode ?? "";
  const [selectedDepartmentId, setSelectedDepartmentId] =
    useState(initialDepartmentId);
  const {
    requests: departmentRequests,
    loading: departmentRequestsLoading,
  } = useRequests(selectedDepartmentId);
  const { requestTypes } = useRequestTypes();

  const [statusFilter, setStatusFilter] = useState<RequestStatusCode | "all">(
    "all",
  );
  const [openForm, setOpenForm] = useState(false);

  // 認証情報の部署が確定したら初期選択部署へ同期して一覧取得に使う。
  useEffect(() => {
    setSelectedDepartmentId(initialDepartmentId);
  }, [initialDepartmentId]);

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

  // 部署プルダウンの選択値を一覧取得対象へ反映する。
  const handleDepartmentChange = (event: SelectChangeEvent<string>) => {
    setSelectedDepartmentId(event.target.value);
  };

  // ステータスプルダウンの選択値を型安全に一覧フィルタへ反映する。
  const handleStatusFilterChange = (event: SelectChangeEvent<string>) => {
    const nextValue = event.target.value;

    if (isRequestStatusFilter(nextValue)) {
      setStatusFilter(nextValue);
    }
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
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <FormControl size="small" sx={{ minWidth: 220 }}>
              <InputLabel id="request-department-filter-label">部署</InputLabel>
              <Select
                labelId="request-department-filter-label"
                value={selectedDepartmentId}
                label="部署"
                onChange={handleDepartmentChange}
                disabled={departmentsLoading}
              >
                {departments.map((department) => (
                  <MenuItem key={department.code} value={department.code}>
                    {department.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel id="request-status-filter-label">状態</InputLabel>
              <Select
                labelId="request-status-filter-label"
                value={statusFilter}
                label="状態"
                onChange={handleStatusFilterChange}
              >
                {REQUEST_STATUS_OPTIONS.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>
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
                    {request.amount === null || request.amount === undefined
                      ? "-"
                      : request.amount.toLocaleString("ja-JP")}
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
