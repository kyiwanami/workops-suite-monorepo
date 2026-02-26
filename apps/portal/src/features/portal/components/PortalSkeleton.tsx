import { Box, Card, CardContent, Grid, Skeleton } from "@mui/material";

interface PortalSkeletonProps {
  itemCount?: number;
  showHeader?: boolean;
}

const PortalSkeleton = ({
  itemCount = 6,
  showHeader = true,
}: PortalSkeletonProps) => {
  return (
    <Box sx={{ p: 3 }}>
      {showHeader && (
        <Box
          sx={{
            mb: 3,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
          }}
        >
          <Box>
            <Skeleton
              variant="rectangular"
              width={120}
              height={36}
              sx={{ borderRadius: 1 }}
            />
          </Box>
        </Box>
      )}

      <Grid container spacing={3}>
        {Array.from(new Array(itemCount)).map((_, index) => (
          <Grid size={{ xs: 12, sm: 6, md: 4 }} key={index}>
            <Card
              sx={{
                height: 180,
                borderTop: (theme) => `4px solid ${theme.palette.divider}`,
                position: "relative",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <CardContent sx={{ flexGrow: 1, pt: 3 }}>
                {/* アイコンとタイトル */}
                <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
                  <Skeleton
                    variant="circular"
                    width={24}
                    height={24}
                    sx={{ mr: 1 }}
                  />
                  <Skeleton
                    variant="text"
                    width="70%"
                    sx={{ fontSize: "h6.fontSize" }}
                  />
                </Box>

                {/* 説明 */}
                <Box sx={{ mb: 2 }}>
                  <Skeleton variant="text" width="100%" />
                  <Skeleton variant="text" width="80%" />
                </Box>

                {/* フッター情報 */}
                <Box sx={{ mt: "auto" }}>
                  <Skeleton
                    variant="rectangular"
                    width="60%"
                    height={20}
                    sx={{ borderRadius: 0.5 }}
                  />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default PortalSkeleton;
