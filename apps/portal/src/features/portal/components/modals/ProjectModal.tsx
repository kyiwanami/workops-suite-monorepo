import { useEffect, useMemo } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  Typography,
  Link,
} from "@mui/material";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { ProjectDataType } from "../../types/project";
import type {
  CreateProjectInput,
  UpdateProjectInput,
} from "../../types/project";
import { useProjects } from "../../hooks/useProjects";
import { getIcon } from "../../utils/getIcon";
import {
  buildProjectFormSchema,
  type ProjectFormValues,
} from "../../schemas/projectFormSchema";

interface ProjectModalProps {
  open: boolean;
  onClose: () => void;
  editingProject?: ProjectDataType | null;
}

const defaultValues: ProjectFormValues = {
  projectId: "",
  name: "",
  description: "",
  urlDomain: "",
  iconName: "",
  color: "",
};

const ProjectModal = ({ open, onClose, editingProject }: ProjectModalProps) => {
  const { projects, createProject, updateProject } = useProjects();
  const isEditMode = !!editingProject;

  const schema = useMemo(
    () =>
      buildProjectFormSchema({
        isEditMode,
        existingProjectIds: projects.map((project) => project.projectId),
      }),
    [isEditMode, projects],
  );

  const {
    control,
    handleSubmit,
    reset,
    watch,
  } = useForm<ProjectFormValues>({
    resolver: zodResolver(schema),
    mode: "onSubmit",
    reValidateMode: "onSubmit",
    defaultValues,
  });

  useEffect(() => {
    if (!open) {
      return;
    }

    if (isEditMode && editingProject) {
      reset({
        projectId: editingProject.projectId,
        name: editingProject.name,
        description: editingProject.description,
        urlDomain: editingProject.urlDomain,
        iconName: editingProject.iconName,
        color: editingProject.color,
      });
      return;
    }

    reset(defaultValues);
  }, [open, isEditMode, editingProject]);

  const iconName = watch("iconName");
  const color = watch("color");

  const onSubmit = async (values: ProjectFormValues) => {
    if (isEditMode) {
      const updateData: UpdateProjectInput = {
        projectId: values.projectId,
        name: values.name,
        description: values.description,
        urlDomain: values.urlDomain,
        iconName: values.iconName,
        color: values.color,
      };
      await updateProject(updateData);
    } else {
      const createData: CreateProjectInput = {
        projectId: values.projectId,
        name: values.name,
        description: values.description,
        urlDomain: values.urlDomain,
        iconName: values.iconName,
        color: values.color,
      };
      await createProject(createData);
    }

    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>
        {isEditMode ? "プロジェクトを編集" : "新しいプロジェクトを登録"}
      </DialogTitle>
      <DialogContent>
        <Controller
          name="name"
          control={control}
          render={({ field, fieldState }) => (
            <TextField
              {...field}
              required
              margin="dense"
              label="プロジェクト名"
              type="text"
              fullWidth
              variant="outlined"
              placeholder="業務ポータル"
              error={!!fieldState.error}
              helperText={fieldState.error?.message}
            />
          )}
        />

        <Controller
          name="projectId"
          control={control}
          render={({ field, fieldState }) => (
            <TextField
              {...field}
              required
              margin="dense"
              label="プロジェクトID"
              type="text"
              fullWidth
              variant="outlined"
              disabled={isEditMode}
              placeholder="WORKOPS_PORTAL"
              error={!!fieldState.error}
              helperText={fieldState.error?.message}
            />
          )}
        />

        <Controller
          name="description"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              margin="dense"
              label="説明"
              type="text"
              fullWidth
              variant="outlined"
              multiline
              rows={3}
              placeholder="プロジェクトの説明"
            />
          )}
        />

        <Controller
          name="urlDomain"
          control={control}
          render={({ field, fieldState }) => (
            <TextField
              {...field}
              required
              margin="dense"
              label="ドメインURL"
              type="text"
              fullWidth
              variant="outlined"
              placeholder="https://example.com"
              error={!!fieldState.error}
              helperText={fieldState.error?.message}
            />
          )}
        />

        <Box sx={{ display: "flex", alignItems: "flex-start", gap: 2 }}>
          <Controller
            name="iconName"
            control={control}
            render={({ field, fieldState }) => (
              <TextField
                {...field}
                margin="dense"
                label="アイコン名"
                type="text"
                placeholder="Settings"
                fullWidth
                variant="outlined"
                error={!!fieldState.error}
                helperText={fieldState.error?.message}
              />
            )}
          />
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 56,
              height: 56,
              border: "1px solid",
              borderColor: "divider",
              borderRadius: 1,
              mt: 1,
              color: color === "" ? "inherit" : color,
            }}
          >
            {iconName ? (
              getIcon(iconName) ? (
                getIcon(iconName)
              ) : (
                <Typography
                  variant="caption"
                  color="error"
                  sx={{ fontSize: "0.7rem" }}
                >
                  無効
                </Typography>
              )
            ) : (
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ fontSize: "0.7rem" }}
              >
                アイコン
              </Typography>
            )}
          </Box>
        </Box>
        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: "block" }}>
          アイコン名の候補は
          <Link
            href="https://mui.com/material-ui/material-icons/"
            target="_blank"
            rel="noopener noreferrer"
            sx={{ ml: 0.5 }}
          >
            Material Icons 一覧
          </Link>
          を参照してください。
        </Typography>

        <Box sx={{ display: "flex", alignItems: "flex-start", gap: 2 }}>
          <Controller
            name="color"
            control={control}
            render={({ field, fieldState }) => (
              <TextField
                {...field}
                margin="dense"
                label="カラーテーマ"
                type="text"
                placeholder="#1976d2"
                fullWidth
                variant="outlined"
                error={!!fieldState.error}
                helperText={fieldState.error?.message}
              />
            )}
          />
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 56,
              height: 56,
              border: "1px solid",
              borderColor: "divider",
              borderRadius: 1,
              mt: 1,
              backgroundColor: color === "" ? "transparent" : color,
            }}
          >
            {!color && (
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ fontSize: "0.7rem" }}
              >
                カラー
              </Typography>
            )}
          </Box>
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>キャンセル</Button>
        <Button onClick={handleSubmit(onSubmit)} variant="contained">
          {isEditMode ? "更新" : "登録"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ProjectModal;
