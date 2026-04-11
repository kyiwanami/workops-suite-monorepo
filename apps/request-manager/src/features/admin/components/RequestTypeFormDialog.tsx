import { useEffect, useState } from "react";
import {
  alpha,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { NumberField } from "@base-ui/react/number-field";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  useRequestType,
  type RequestTypeCreateInput,
} from "../hooks/useRequestTypes";
import { useNotification } from "@workops-suite/shared-notification";
import {
  requestTypeFormSchema,
  type RequestTypeFormValues,
} from "../schemas/requestTypeFormSchema";

type RequestTypeFormDialogProps = {
  open: boolean;
  onClose: () => void;
  id?: string | null;
};

const defaultValues: RequestTypeFormValues = {
  code: "",
  name: "",
  description: "",
  sortOrder: undefined,
};

export function RequestTypeFormDialog({
  open,
  onClose,
  id,
}: RequestTypeFormDialogProps) {
  const { getRequestType, createRequestType, updateRequestType } =
    useRequestType();
  const { showError, showSuccess } = useNotification();

  const [loading, setLoading] = useState(false);

  const { control, handleSubmit, reset } = useForm<RequestTypeFormValues>({
    resolver: zodResolver(requestTypeFormSchema),
    mode: "onSubmit",
    reValidateMode: "onSubmit",
    defaultValues,
  });

  useEffect(() => {
    const fetchData = async () => {
      if (!open) {
        return;
      }

      if (!id) {
        reset(defaultValues);
        return;
      }

      setLoading(true);
      const current = await getRequestType(id);
      if (current) {
        reset({
          code: current.code,
          name: current.name,
          description: current.description,
          sortOrder: current.sortOrder,
        });
      } else {
        showError("申請種別の取得に失敗しました");
      }
      setLoading(false);
    };

    void fetchData();
  }, [open, id]);

  const onSubmit = async (values: RequestTypeFormValues) => {
    setLoading(true);

    const payload: RequestTypeCreateInput = {
      code: values.code,
      name: values.name,
      description: values.description,
      sortOrder: values.sortOrder,
      isActive: true,
    };

    if (id) {
      const updated = await updateRequestType({ id, ...payload });
      if (updated) {
        showSuccess("申請種別を更新しました");
        onClose();
      } else {
        showError("申請種別の更新に失敗しました");
      }
    } else {
      const created = await createRequestType(payload);
      if (created) {
        showSuccess("申請種別を登録しました");
        onClose();
      } else {
        showError("申請種別の登録に失敗しました");
      }
    }

    setLoading(false);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 4,
          border: "1px solid",
          borderColor: "divider",
        },
      }}
    >
      <DialogTitle>
        <Stack spacing={0.5}>
          <Typography component="span" variant="h6" fontWeight={700}>
            {id ? "申請種別を編集" : "申請種別を追加"}
          </Typography>
          <Typography component="span" variant="body2" color="text.secondary">
            申請フォームで選択される種別情報を設定します
          </Typography>
        </Stack>
      </DialogTitle>
      <Box component="form" onSubmit={handleSubmit(onSubmit)}>
        <DialogContent
          sx={{
            background: (theme) =>
              `linear-gradient(180deg, ${alpha(theme.palette.primary.light, 0.06)} 0%, ${theme.palette.background.paper} 42%)`,
          }}
        >
          <Stack spacing={2.5}>
            <Controller
              name="code"
              control={control}
              render={({ field, fieldState }) => (
                <TextField
                  {...field}
                  required
                  label="コード"
                  autoFocus
                  fullWidth
                  placeholder="EXPENSE"
                  error={!!fieldState.error}
                  helperText={fieldState.error?.message}
                />
              )}
            />

            <Controller
              name="name"
              control={control}
              render={({ field, fieldState }) => (
                <TextField
                  {...field}
                  required
                  label="名称"
                  fullWidth
                  placeholder="経費精算"
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
                  label="説明"
                  fullWidth
                  placeholder="交通費・立替費用の精算申請に利用"
                  multiline
                  rows={3}
                />
              )}
            />

            <Controller
              name="sortOrder"
              control={control}
              render={({ field, fieldState }) => (
                <Box>
                  <Typography variant="body2" sx={{ mb: 0.5 }}>
                    表示順
                  </Typography>
                  <NumberField.Root
                    value={field.value ?? null}
                    min={0}
                    step={1}
                    name={field.name}
                    inputRef={field.ref}
                    disabled={loading}
                    onValueChange={(value) =>
                      field.onChange(value === null ? undefined : value)
                    }
                  >
                    <NumberField.Group
                      style={{
                        display: "flex",
                        alignItems: "center",
                        border: fieldState.error ? "1px solid #d32f2f" : "1px solid #c4c4c4",
                        borderRadius: 4,
                      }}
                    >
                      <NumberField.Input
                        placeholder="10"
                        onBlur={field.onBlur}
                        style={{
                          width: "100%",
                          border: "none",
                          outline: "none",
                          font: "inherit",
                          paddingBlock: 6,
                          paddingInline: 8,
                        }}
                      />
                    </NumberField.Group>
                  </NumberField.Root>
                  {fieldState.error?.message && (
                    <Typography color="error" variant="caption" sx={{ mt: 0.5, display: "block" }}>
                      {fieldState.error.message}
                    </Typography>
                  )}
                </Box>
              )}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={onClose} color="inherit" disabled={loading}>
            キャンセル
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={loading}
            startIcon={
              loading ? (
                <CircularProgress size={16} color="inherit" />
              ) : undefined
            }
          >
            {id ? "更新" : "登録"}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}
