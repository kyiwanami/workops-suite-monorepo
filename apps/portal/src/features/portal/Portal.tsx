import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import {
  Box,
  Button,
  Divider,
  Grid,
  IconButton,
  Typography,
} from "@mui/material";
import { getIcon } from "./utils/getIcon";
import React, { useState } from "react";
import { useSearchParams } from "react-router";
import PageModal from "./components/modals/PageModal";
import AppModal from "./components/modals/AppModal";
import PageCard from "./components/PageCard";
import PortalSkeleton from "./components/PortalSkeleton";
import { usePages } from "./hooks/usePages";
import { useApps } from "./hooks/useApps";
import {
  type PageDataType,
  type CreatePageInput,
  type UpdatePageInput,
} from "./types/app";

const Portal = () => {
  const { apps, isLoading, deleteApp } = useApps();

  const [searchParams] = useSearchParams();
  const currentAppId = searchParams.get("appId");

  // 選択されたプロジェクトを計算
  const selectedApp = currentAppId
    ? apps.find((p) => p.appId === currentAppId)
    : undefined;

  // クエリパラメータでプロジェクトが指定されている場合は該当プロジェクトのみ、なければ全プロジェクトのページを取得
  const {
    pages: allPages,
    isLoading: pagesLoading,
    createPage,
    updatePage,
    deletePage,
  } = usePages(currentAppId || "ALL_PROJECTS");

  // プロジェクト別にページをフィルタリング
  const getPagesByApp = (appId: string) => {
    return allPages.filter((page) => page.appId === appId);
  };

  // モーダル状態管理
  const [isAppModalOpen, setIsAppModalOpen] = useState(false);
  const [isPageModalOpen, setIsPageModalOpen] = useState(false);
  const [editingApp, setEditingApp] =
    useState<typeof selectedApp>(undefined);
  const [editingPage, setEditingPage] = useState<PageDataType | undefined>(
    undefined
  );
  const [editingAppForModal, setEditingAppForModal] =
    useState<typeof selectedApp>(undefined);

  // プロジェクト操作ハンドラー
  const handleAppEdit = (app: typeof selectedApp) => {
    setEditingApp(app);
    setIsAppModalOpen(true);
  };

  const handleAppDelete = async (
    appId: string,
    appName: string
  ) => {
    if (
      window.confirm(
        `プロジェクト「${appName}」を削除しますか？\n(注意: このプロジェクトに関連するページもすべて削除されます)`
      )
    ) {
      await deleteApp(appId);
    }
  };

  // ページ操作ハンドラー
  const handleOpenRegisterPageModal = (
    pageToEdit?: PageDataType,
    appForModal?: typeof selectedApp
  ) => {
    setEditingPage(pageToEdit);
    setEditingAppForModal(appForModal ?? selectedApp);
    setIsPageModalOpen(true);
  };

  const handleCloseRegisterPageModal = () => {
    setIsPageModalOpen(false);
    setEditingPage(undefined);
    setEditingAppForModal(undefined);
  };

  const handlePageSubmit = async (
    pageData: CreatePageInput | UpdatePageInput
  ) => {
    if (editingPage) {
      await updatePage(pageData);
    } else {
      await createPage({
        ...pageData,
        name: pageData.name ?? "",
      });
    }
    handleCloseRegisterPageModal();
  };

  const handlePageDelete = async (
    pageId: string,
    appId: string,
    pageName: string
  ) => {
    if (window.confirm(`「${pageName}」ページを本当に削除しますか？`)) {
      await deletePage(pageId, appId);
    }
  };

  if (isLoading) {
    return <PortalSkeleton />;
  }

  // 表示するプロジェクトを決定
  const appsToDisplay = apps.filter(
    (p) => !currentAppId || p.appId === currentAppId
  );

  return (
    <Box component="main" sx={{ flexGrow: 1, px: 4 }}>
      {appsToDisplay.map((app, index) => (
        <React.Fragment key={app.appId}>
          <Box
            sx={{
              mb: 3,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              gap: 2,
            }}
          >
            <Box sx={{ flexGrow: 1, minWidth: 0 }}>
              <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
                {app.iconName && (
                  <Box sx={{ mr: 1, color: app.color ?? "inherit" }}>
                    {getIcon(app.iconName)}
                  </Box>
                )}
                <Typography
                  variant="h5"
                  component="h2"
                  gutterBottom
                  sx={{ mb: 0, mr: 1 }}
                >
                  {app.name}
                </Typography>
                <Box>
                  <IconButton
                    aria-label="edit app"
                    size="small"
                    onClick={() => handleAppEdit(app)}
                    sx={{ color: "text.secondary", p: "4px" }}
                  >
                    <EditIcon fontSize="inherit" />
                  </IconButton>
                  <IconButton
                    aria-label="delete app"
                    size="small"
                    onClick={() =>
                      handleAppDelete(app.appId, app.name)
                    }
                    sx={{ color: "text.secondary", p: "4px" }}
                  >
                    <DeleteIcon fontSize="inherit" />
                  </IconButton>
                </Box>
              </Box>
              {app.description && (
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{
                    mb: 2,
                    display: "-webkit-box",
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    lineHeight: 1.4,
                  }}
                >
                  {app.description}
                </Typography>
              )}
            </Box>

            <Button
              variant="outlined"
              startIcon={<AddCircleOutlineIcon />}
              onClick={() => handleOpenRegisterPageModal(undefined, app)}
              sx={{ flexShrink: 0 }}
            >
              ページ追加
            </Button>
          </Box>

          {/* ページ一覧表示 */}
          {pagesLoading ? (
            <Box sx={{ mb: 4 }}>
              <Typography>ページを読み込み中...</Typography>
            </Box>
          ) : (
            <Grid container spacing={3} sx={{ mb: 4 }}>
              {getPagesByApp(app.appId).map((page) => (
                <PageCard
                  key={page.pageId}
                  page={page}
                  appColor={app.color}
                  appUrlDomain={app.urlDomain}
                  onEdit={(page) => handleOpenRegisterPageModal(page, app)}
                  onDelete={handlePageDelete}
                />
              ))}
            </Grid>
          )}

          {index < appsToDisplay.length - 1 && <Divider sx={{ my: 4 }} />}
        </React.Fragment>
      ))}

      {/* プロジェクト編集モーダル */}
      <AppModal
        open={isAppModalOpen}
        onClose={() => {
          setIsAppModalOpen(false);
          setEditingApp(undefined);
        }}
        editingApp={editingApp}
      />

      {/* ページ登録・編集モーダル */}
      {editingAppForModal && (
        <PageModal
          open={isPageModalOpen}
          onClose={handleCloseRegisterPageModal}
          onSubmit={handlePageSubmit}
          selectedApp={editingAppForModal}
          editingPage={editingPage}
        />
      )}
    </Box>
  );
};

export default Portal;
