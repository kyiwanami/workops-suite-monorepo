import { useEffect, useMemo } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Alert,
  Box,
  Typography,
  Link,
} from "@mui/material";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { AppDataType } from "../../types/app";
import type {
  CreateAppInput,
  UpdateAppInput,
} from "../../types/app";
import { useApps } from "../../hooks/useApps";
import { getIcon } from "../../utils/getIcon";
import {
  buildAppFormSchema,
  type AppFormValues,
} from "../../schemas/appFormSchema";

interface AppModalProps {
  open: boolean;
  onClose: () => void;
  editingApp?: AppDataType | null;
}

const defaultValues: AppFormValues = {
  appId: "",
  name: "",
  description: "",
  urlDomain: "",
  iconName: "",
  color: "",
};

const AppModal = ({ open, onClose, editingApp }: AppModalProps) => {
  const { apps, createApp, updateApp, operationLoading, operationError } =
    useApps();
  const isEditMode = !!editingApp;

  const schema = useMemo(
    () =>
      buildAppFormSchema({
        isEditMode,
        existingAppIds: apps.map((app) => app.appId),
      }),
    [isEditMode, apps],
  );

  const {
    control,
    handleSubmit,
    reset,
    watch,
  } = useForm<AppFormValues>({
    resolver: zodResolver(schema),
    mode: "onSubmit",
    reValidateMode: "onSubmit",
    defaultValues,
  });

  useEffect(() => {
    if (!open) {
      return;
    }

    if (isEditMode && editingApp) {
      reset({
        appId: editingApp.appId,
        name: editingApp.name,
        description: editingApp.description,
        urlDomain: editingApp.urlDomain,
        iconName: editingApp.iconName,
        color: editingApp.color,
      });
      return;
    }

    reset(defaultValues);
  }, [open, isEditMode, editingApp]);

  const iconName = watch("iconName");
  const color = watch("color");

  const onSubmit = async (values: AppFormValues) => {
    if (isEditMode) {
      const updateData: UpdateAppInput = {
        appId: values.appId,
        name: values.name,
        description: values.description,
        urlDomain: values.urlDomain,
        iconName: values.iconName,
        color: values.color,
      };
      const updatedApp = await updateApp(updateData);
      if (updatedApp) {
        onClose();
      }
      return;
    }

    const createData: CreateAppInput = {
      appId: values.appId,
      name: values.name,
      description: values.description,
      urlDomain: values.urlDomain,
      iconName: values.iconName,
      color: values.color,
    };
    const createdApp = await createApp(createData);
    if (createdApp) {
      onClose();
    }
  };

  const handleClose = () => {
    if (!operationLoading) {
      onClose();
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
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
              disabled={operationLoading}
              error={!!fieldState.error}
              helperText={fieldState.error?.message}
            />
          )}
        />

        <Controller
          name="appId"
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
              disabled={operationLoading || isEditMode}
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
              disabled={operationLoading}
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
              disabled={operationLoading}
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
                disabled={operationLoading}
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
                disabled={operationLoading}
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

      <DialogActions sx={{ alignItems: "center" }}>
        {operationError && (
          <Alert severity="error" sx={{ flexGrow: 1 }}>
            {operationError}
          </Alert>
        )}
        <Button onClick={handleClose} disabled={operationLoading}>
          キャンセル
        </Button>
        <Button
          onClick={handleSubmit(onSubmit)}
          variant="contained"
          disabled={operationLoading}
        >
          {operationLoading
            ? isEditMode
              ? "更新中..."
              : "登録中..."
            : isEditMode
              ? "更新"
              : "登録"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AppModal;
