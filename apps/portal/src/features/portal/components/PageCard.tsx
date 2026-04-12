import {
  Grid,
  Card,
  CardActionArea,
  CardContent,
  Box,
  IconButton,
  Typography,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import { getIcon } from "../utils/getIcon";
import type { PageDataType } from "../types/app";

interface PageCardProps {
  page: PageDataType;
  appColor?: string | null;
  appUrlDomain: string;
  onEdit?: (page: PageDataType) => void;
  onDelete?: (pageId: string, appId: string, pageName: string) => void;
  onClick?: (page: PageDataType) => void;
}

const PageCard = ({
  page,
  appColor,
  appUrlDomain,
  onEdit,
  onDelete,
}: PageCardProps) => {
  // 完全なURLを生成
  const relativePath = page.relativePath ?? "";
  const pageUrl = appUrlDomain
    ? `${appUrlDomain}${relativePath ? "/" + relativePath : ""}`
    : "#";

  const pageIcon = getIcon(page.iconName);

  const handleEdit = (event: React.MouseEvent) => {
    event.stopPropagation();
    onEdit?.(page);
  };

  const handleDelete = (event: React.MouseEvent) => {
    event.stopPropagation();
    onDelete?.(page.pageId, page.appId, page.name);
  };

  return (
    <Grid size={{ xs: 12, sm: 6, md: 4 }}>
      <Card
        sx={{
          height: 200,
          borderTop: appColor ? `4px solid ${appColor}` : "none",
          position: "relative",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* 編集・削除ボタン */}
        <Box
          sx={{
            position: "absolute",
            top: 8,
            right: 8,
            zIndex: 2,
            display: "flex",
            gap: 0.5,
          }}
        >
          {onEdit && (
            <IconButton
              aria-label="edit page"
              size="small"
              onClick={handleEdit}
              sx={{ color: "text.secondary", p: "4px" }}
            >
              <EditIcon fontSize="inherit" />
            </IconButton>
          )}
          {onDelete && (
            <IconButton
              aria-label="delete page"
              size="small"
              onClick={handleDelete}
              sx={{ color: "text.secondary", p: "4px" }}
            >
              <DeleteIcon fontSize="inherit" />
            </IconButton>
          )}
        </Box>

        {/* 外部リンクとして動作するCardActionArea */}
        <CardActionArea
          href={pageUrl}
          target="_blank"
          rel="noopener noreferrer"
          sx={{
            height: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "stretch",
            justifyContent: "flex-start",
            pt: "30px",
            textDecoration: "none",
            color: "inherit",
            "&:hover": { backgroundColor: "action.hover" },
          }}
        >
          <CardContent
            sx={{
              flexGrow: 1,
              width: "100%",
              position: "relative",
              pb: "16px !important",
            }}
          >
            {/* 外部リンクアイコン */}
            <OpenInNewIcon
              sx={{
                position: "absolute",
                top: 8,
                right: 8,
                fontSize: "1rem",
                color: "text.disabled",
              }}
            />

            {/* アイコンとタイトル */}
            <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
              <Box
                sx={{
                  mr: 0.8,
                  color: appColor ?? "inherit",
                  display: "flex",
                  alignItems: "center",
                }}
              >
                {pageIcon}
              </Box>
              <Typography
                gutterBottom
                variant="h6"
                component="div"
                sx={{ mb: 0, pr: "24px" }}
              >
                {page.name}
              </Typography>
            </Box>

            {/* 説明 */}
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{
                display: "-webkit-box",
                WebkitLineClamp: 3,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
                textOverflow: "ellipsis",
                lineHeight: 1.4,
              }}
            >
              {page.description}
            </Typography>
          </CardContent>
        </CardActionArea>
      </Card>
    </Grid>
  );
};

export default PageCard;
