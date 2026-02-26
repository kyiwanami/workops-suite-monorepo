import {
  Box,
  CircularProgress,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from "@mui/material";
import { DeleteOutline as DeleteIcon } from "@mui/icons-material";
import { type DepartmentType } from "../types";

interface DepartmentTableProps {
  departments: DepartmentType[];
  loading: boolean;
  onDeleteRequest: (dept: DepartmentType) => void;
  canDelete: boolean;
}

export const DepartmentTable = ({
  departments,
  loading,
  onDeleteRequest,
  canDelete,
}: DepartmentTableProps) => {
  if (loading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: 200,
        }}
      >
        <CircularProgress size={32} />
      </Box>
    );
  }

  return (
    <TableContainer
      component={Paper}
      elevation={0}
      sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2 }}
    >
      <Table>
        <TableHead>
          <TableRow sx={{ bgcolor: "grey.50" }}>
            <TableCell sx={{ fontWeight: 600, color: "text.secondary", fontSize: "0.75rem", letterSpacing: "0.05em", textTransform: "uppercase" }}>
              部署コード
            </TableCell>
            <TableCell sx={{ fontWeight: 600, color: "text.secondary", fontSize: "0.75rem", letterSpacing: "0.05em", textTransform: "uppercase" }}>
              部署名
            </TableCell>
            <TableCell sx={{ fontWeight: 600, color: "text.secondary", fontSize: "0.75rem", letterSpacing: "0.05em", textTransform: "uppercase" }}>
              表示順
            </TableCell>
            <TableCell sx={{ fontWeight: 600, color: "text.secondary", fontSize: "0.75rem", letterSpacing: "0.05em", textTransform: "uppercase" }}>
              備考
            </TableCell>
            <TableCell align="right" sx={{ fontWeight: 600, color: "text.secondary", fontSize: "0.75rem", letterSpacing: "0.05em", textTransform: "uppercase" }}>
              操作
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {departments.map((dept) => (
            <TableRow
              key={dept.code}
              sx={{ "&:hover": { bgcolor: "grey.50" }, "&:last-child td": { border: 0 } }}
            >
              <TableCell>
                <Typography
                  variant="body2"
                  sx={{
                    fontFamily: "monospace",
                    fontWeight: 600,
                    color: "primary.main",
                    bgcolor: "primary.50",
                    px: 1,
                    py: 0.5,
                    borderRadius: 1,
                    display: "inline-block",
                  }}
                >
                  {dept.code}
                </Typography>
              </TableCell>
              <TableCell>
                <Typography variant="body2" fontWeight={500}>
                  {dept.name}
                </Typography>
              </TableCell>
              <TableCell>
                <Typography variant="body2" color="text.secondary">
                  {dept.sortOrder != null ? dept.sortOrder : "—"}
                </Typography>
              </TableCell>
              <TableCell>
                <Typography variant="body2" color="text.secondary">
                  {dept.notes ?? "—"}
                </Typography>
              </TableCell>
              <TableCell align="right">
                {canDelete && (
                  <Tooltip title="削除" placement="top">
                    <IconButton
                      size="small"
                      onClick={() => onDeleteRequest(dept)}
                      sx={{ color: "text.disabled", "&:hover": { color: "error.main" } }}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                )}
              </TableCell>
            </TableRow>
          ))}
          {departments.length === 0 && (
            <TableRow>
              <TableCell colSpan={5}>
                <Box sx={{ py: 6, textAlign: "center" }}>
                  <Typography variant="body2" color="text.disabled">
                    部署が登録されていません
                  </Typography>
                </Box>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
};
