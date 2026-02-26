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
import ProjectModal from "./components/modals/ProjectModal";
import PageCard from "./components/PageCard";
import PortalSkeleton from "./components/PortalSkeleton";
import { usePages } from "./hooks/usePages";
import { useProjects } from "./hooks/useProjects";
import {
  type PageDataType,
  type CreatePageInput,
  type UpdatePageInput,
} from "./types/project";

const Portal = () => {
  const { projects, isLoading, deleteProject } = useProjects();

  const [searchParams] = useSearchParams();
  const currentProjectId = searchParams.get("projectId");

  // 選択されたプロジェクトを計算
  const selectedProject = currentProjectId
    ? projects.find((p) => p.projectId === currentProjectId)
    : undefined;

  // クエリパラメータでプロジェクトが指定されている場合は該当プロジェクトのみ、なければ全プロジェクトのページを取得
  const {
    pages: allPages,
    isLoading: pagesLoading,
    createPage,
    updatePage,
    deletePage,
  } = usePages(currentProjectId || "ALL_PROJECTS");

  // プロジェクト別にページをフィルタリング
  const getPagesByProject = (projectId: string) => {
    return allPages.filter((page) => page.projectId === projectId);
  };

  // モーダル状態管理
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [isPageModalOpen, setIsPageModalOpen] = useState(false);
  const [editingProject, setEditingProject] =
    useState<typeof selectedProject>(undefined);
  const [editingPage, setEditingPage] = useState<PageDataType | undefined>(
    undefined
  );
  const [editingProjectForModal, setEditingProjectForModal] =
    useState<typeof selectedProject>(undefined);

  // プロジェクト操作ハンドラー
  const handleProjectEdit = (project: typeof selectedProject) => {
    setEditingProject(project);
    setIsProjectModalOpen(true);
  };

  const handleProjectDelete = async (
    projectId: string,
    projectName: string
  ) => {
    if (
      window.confirm(
        `プロジェクト「${projectName}」を削除しますか？\n(注意: このプロジェクトに関連するページもすべて削除されます)`
      )
    ) {
      await deleteProject(projectId);
    }
  };

  // ページ操作ハンドラー
  const handleOpenRegisterPageModal = (
    pageToEdit?: PageDataType,
    projectForModal?: typeof selectedProject
  ) => {
    setEditingPage(pageToEdit);
    setEditingProjectForModal(projectForModal ?? selectedProject);
    setIsPageModalOpen(true);
  };

  const handleCloseRegisterPageModal = () => {
    setIsPageModalOpen(false);
    setEditingPage(undefined);
    setEditingProjectForModal(undefined);
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
    projectId: string,
    pageName: string
  ) => {
    if (window.confirm(`「${pageName}」ページを本当に削除しますか？`)) {
      await deletePage(pageId, projectId);
    }
  };

  if (isLoading) {
    return <PortalSkeleton />;
  }

  // 表示するプロジェクトを決定
  const projectsToDisplay = projects.filter(
    (p) => !currentProjectId || p.projectId === currentProjectId
  );

  return (
    <Box component="main" sx={{ flexGrow: 1, px: 4 }}>
      {projectsToDisplay.map((project, index) => (
        <React.Fragment key={project.projectId}>
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
                {project.iconName && (
                  <Box sx={{ mr: 1, color: project.color ?? "inherit" }}>
                    {getIcon(project.iconName)}
                  </Box>
                )}
                <Typography
                  variant="h5"
                  component="h2"
                  gutterBottom
                  sx={{ mb: 0, mr: 1 }}
                >
                  {project.name}
                </Typography>
                <Box>
                  <IconButton
                    aria-label="edit project"
                    size="small"
                    onClick={() => handleProjectEdit(project)}
                    sx={{ color: "text.secondary", p: "4px" }}
                  >
                    <EditIcon fontSize="inherit" />
                  </IconButton>
                  <IconButton
                    aria-label="delete project"
                    size="small"
                    onClick={() =>
                      handleProjectDelete(project.projectId, project.name)
                    }
                    sx={{ color: "text.secondary", p: "4px" }}
                  >
                    <DeleteIcon fontSize="inherit" />
                  </IconButton>
                </Box>
              </Box>
              {project.description && (
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
                  {project.description}
                </Typography>
              )}
            </Box>

            <Button
              variant="outlined"
              startIcon={<AddCircleOutlineIcon />}
              onClick={() => handleOpenRegisterPageModal(undefined, project)}
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
              {getPagesByProject(project.projectId).map((page) => (
                <PageCard
                  key={page.pageId}
                  page={page}
                  projectColor={project.color}
                  projectUrlDomain={project.urlDomain}
                  onEdit={(page) => handleOpenRegisterPageModal(page, project)}
                  onDelete={handlePageDelete}
                />
              ))}
            </Grid>
          )}

          {index < projectsToDisplay.length - 1 && <Divider sx={{ my: 4 }} />}
        </React.Fragment>
      ))}

      {/* プロジェクト編集モーダル */}
      <ProjectModal
        open={isProjectModalOpen}
        onClose={() => {
          setIsProjectModalOpen(false);
          setEditingProject(undefined);
        }}
        editingProject={editingProject}
      />

      {/* ページ登録・編集モーダル */}
      {editingProjectForModal && (
        <PageModal
          open={isPageModalOpen}
          onClose={handleCloseRegisterPageModal}
          onSubmit={handlePageSubmit}
          selectedProject={editingProjectForModal}
          editingPage={editingPage}
        />
      )}
    </Box>
  );
};

export default Portal;
