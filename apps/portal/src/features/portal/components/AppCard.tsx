import {
  Grid,
  Card,
  CardActionArea,
  CardContent,
  Box,
  IconButton,
  Typography,
  Tooltip,
  Chip,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import { getIcon } from "../utils/getIcon";
import type { AppDataType } from "../types/app";

interface AppCardProps {
  app: AppDataType;
  onEdit?: (app: AppDataType) => void;
  onDelete?: (appId: string) => void;
  onClick?: (app: AppDataType) => void;
}

const AppCard = ({
  app,
  onEdit,
  onDelete,
  onClick,
}: AppCardProps) => {
  const appIcon = getIcon(app.iconName);

  const handleEdit = (event: React.MouseEvent) => {
    event.stopPropagation();
    onEdit?.(app);
  };

  const handleDelete = (event: React.MouseEvent) => {
    event.stopPropagation();
    if (
      window.confirm(
        `プロジェクト「${app.name}」を削除しますか?\n関連するページも全て削除されます。`
      )
    ) {
      onDelete?.(app.appId);
    }
  };

  const handleCardClick = () => {
    onClick?.(app);
  };

  return (
    <Grid size={{ xs: 12, sm: 6, md: 4 }}>
      <Card
        sx={{
          height: 200,
          borderTop: app.color
            ? `4px solid ${app.color}`
            : "4px solid #1976d2",
          position: "relative",
          display: "flex",
          flexDirection: "column",
          transition: "all 0.2s ease-in-out",
          "&:hover": {
            transform: "translateY(-2px)",
            boxShadow: (theme) => theme.shadows[6],
          },
        }}
      >
        {/* アクションボタン */}
        <Box
          sx={{
            position: "absolute",
            top: 8,
            right: 8,
            display: "flex",
            gap: 0.5,
            opacity: 0.7,
            transition: "opacity 0.2s ease-in-out",
            ".MuiCard-root:hover &": {
              opacity: 1,
            },
          }}
        >
          {onEdit && (
            <Tooltip title="編集">
              <IconButton
                size="small"
                onClick={handleEdit}
                sx={{
                  bgcolor: "background.paper",
                  boxShadow: 1,
                  "&:hover": {
                    bgcolor: "warning.main",
                    color: "warning.contrastText",
                  },
                }}
              >
                <EditIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          {onDelete && (
            <Tooltip title="削除">
              <IconButton
                size="small"
                onClick={handleDelete}
                sx={{
                  bgcolor: "background.paper",
                  boxShadow: 1,
                  "&:hover": {
                    bgcolor: "error.main",
                    color: "error.contrastText",
                  },
                }}
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Box>

        <CardActionArea
          onClick={handleCardClick}
          sx={{
            flexGrow: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "stretch",
            justifyContent: "flex-start",
          }}
        >
          <CardContent sx={{ flexGrow: 1, pt: 3 }}>
            {/* アイコンとタイトル */}
            <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
              <Box
                sx={{
                  mr: 2,
                  color: app.color ?? "primary.main",
                  display: "flex",
                  alignItems: "center",
                  fontSize: "2rem",
                }}
              >
                {appIcon}
              </Box>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography
                  variant="h5"
                  component="h3"
                  sx={{
                    fontWeight: 600,
                    lineHeight: 1.2,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    mb: 0.5,
                  }}
                >
                  {app.name}
                </Typography>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{
                    fontFamily: "monospace",
                    display: "block",
                  }}
                >
                  {app.appId}
                </Typography>
              </Box>
            </Box>

            {/* 説明 */}
            {app.description && (
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{
                  mb: 2,
                  overflow: "hidden",
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                  lineHeight: 1.4,
                }}
              >
                {app.description}
              </Typography>
            )}

            {/* 統計情報 */}
            <Box sx={{ display: "flex", gap: 1, mb: 2, flexWrap: "wrap" }}>
              <Chip
                label={`${app.pages.length} ページ`}
                size="small"
                variant="outlined"
                color="primary"
              />
            </Box>

            {/* URL */}
            <Box sx={{ mt: "auto" }}>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{
                  display: "block",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  fontFamily: "monospace",
                  bgcolor: "grey.50",
                  px: 1,
                  py: 0.5,
                  borderRadius: 0.5,
                }}
              >
                {app.urlDomain}
              </Typography>
            </Box>
          </CardContent>
        </CardActionArea>
      </Card>
    </Grid>
  );
};

export default AppCard;
