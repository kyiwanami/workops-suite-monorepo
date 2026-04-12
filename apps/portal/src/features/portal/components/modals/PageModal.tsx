import { useEffect, useMemo } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  InputAdornment,
  Typography,
  Link,
} from "@mui/material";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type {
  AppDataType,
  PageDataType,
  CreatePageInput,
  UpdatePageInput,
} from "../../types/app";
import { getIcon } from "../../utils/getIcon";
import {
  buildPageFormSchema,
  type PageFormValues,
} from "../../schemas/pageFormSchema";

interface PageModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (page: CreatePageInput | UpdatePageInput) => Promise<void>;
  selectedApp: AppDataType;
  editingPage?: PageDataType | null;
}

const defaultValues: PageFormValues = {
  pageId: "",
  name: "",
  description: "",
  relativePath: "",
  iconName: "",
};

const PageModal = ({
  open,
  onClose,
  onSubmit,
  selectedApp,
  editingPage,
}: PageModalProps) => {
  const isEditMode = !!editingPage;

  const schema = useMemo(
    () =>
      buildPageFormSchema({
        isEditMode,
        existingPageIds: selectedApp.pages.map((page) => page.pageId),
      }),
    [isEditMode, selectedApp],
  );

  const {
    control,
    handleSubmit,
    reset,
    watch,
  } = useForm<PageFormValues>({
    resolver: zodResolver(schema),
    mode: "onSubmit",
    reValidateMode: "onSubmit",
    defaultValues,
  });

  useEffect(() => {
    if (!open) {
      return;
    }

    if (isEditMode && editingPage) {
      reset({
        pageId: editingPage.pageId,
        name: editingPage.name,
        description: editingPage.description,
        relativePath: editingPage.relativePath,
        iconName: editingPage.iconName,
      });
      return;
    }

    reset(defaultValues);
  }, [open, isEditMode, editingPage]);

  const relativePath = watch("relativePath");
  const iconName = watch("iconName");

  const getFullUrl = () => {
    if (!relativePath) {
      return selectedApp.urlDomain;
    }
    const cleanDomain = selectedApp.urlDomain.replace(/\/$/, "");
    const cleanPath = relativePath.replace(/^\//, "");
    return `${cleanDomain}/${cleanPath}`;
  };

  const submitForm = async (values: PageFormValues) => {
    if (isEditMode) {
      const updateData: UpdatePageInput = {
        pageId: values.pageId,
        appId: selectedApp.appId,
        name: values.name,
        description: values.description,
        relativePath: values.relativePath,
        iconName: values.iconName,
      };
      await onSubmit(updateData);
    } else {
      const createData: CreatePageInput = {
        pageId: values.pageId,
        appId: selectedApp.appId,
        name: values.name,
        description: values.description,
        relativePath: values.relativePath,
        iconName: values.iconName,
      };
      await onSubmit(createData);
    }

    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>
        {isEditMode ? "ページを編集" : "新しいページを登録"}
      </DialogTitle>
      <DialogContent>
        <TextField
          margin="dense"
          label="プロジェクト"
          type="text"
          fullWidth
          variant="outlined"
          value={selectedApp.name}
          disabled
          sx={{ mb: 2 }}
        />

        <Controller
          name="name"
          control={control}
          render={({ field, fieldState }) => (
            <TextField
              {...field}
              required
              margin="dense"
              label="ページ名"
              type="text"
              fullWidth
              variant="outlined"
              placeholder="会社概要"
              disabled={isEditMode}
              error={!!fieldState.error}
              helperText={fieldState.error?.message}
            />
          )}
        />

        <Controller
          name="pageId"
          control={control}
          render={({ field, fieldState }) => (
            <TextField
              {...field}
              required
              margin="dense"
              label="ページID"
              type="text"
              fullWidth
              variant="outlined"
              disabled={isEditMode}
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
              placeholder="ページの説明"
            />
          )}
        />

        <Controller
          name="relativePath"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              margin="dense"
              label="相対パス"
              type="text"
              placeholder="/about"
              fullWidth
              variant="outlined"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    {selectedApp.urlDomain.replace(/\/$/, "")}/
                  </InputAdornment>
                ),
              }}
            />
          )}
        />

        <Box sx={{ mt: 1, p: 2, bgcolor: "grey.50", borderRadius: 1 }}>
          <Typography variant="body2" color="text.secondary">
            完全なURL:
          </Typography>
          <Typography variant="body2" sx={{ wordBreak: "break-all" }}>
            {getFullUrl()}
          </Typography>
        </Box>

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
                placeholder="Description"
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
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>キャンセル</Button>
        <Button onClick={handleSubmit(submitForm)} variant="contained">
          {isEditMode ? "更新" : "登録"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default PageModal;
