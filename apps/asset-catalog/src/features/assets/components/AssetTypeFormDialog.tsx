import { useEffect, useState } from "react";
import {
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
import { useAssetType, type AssetTypeCreateInput } from "../hooks/useAssetType";
import { useNotification } from "@workops-suite/shared-notification";
import {
  assetTypeFormSchema,
  type AssetTypeFormValues,
} from "../schemas/assetTypeFormSchema";

type AssetTypeFormDialogProps = {
  open: boolean;
  onClose: () => void;
  id?: string | null;
};

const defaultValues: AssetTypeFormValues = {
  code: "",
  name: "",
  description: "",
  sortOrder: undefined,
};

export function AssetTypeFormDialog({ open, onClose, id }: AssetTypeFormDialogProps) {
  const { getAssetType, createAssetType, updateAssetType } = useAssetType();
  const { showError, showSuccess } = useNotification();
  const [loading, setLoading] = useState(false);

  const { control, handleSubmit, reset } = useForm<AssetTypeFormValues>({
    resolver: zodResolver(assetTypeFormSchema),
    mode: "onSubmit",
    reValidateMode: "onSubmit",
    defaultValues,
  });

  useEffect(() => {
    const fetchAssetType = async () => {
      if (!open) {
        return;
      }

      if (!id) {
        reset(defaultValues);
        return;
      }

      setLoading(true);
      const current = await getAssetType(id);
      if (current) {
        reset({
          code: current.code,
          name: current.name,
          description: current.description,
          sortOrder: current.sortOrder,
        });
      } else {
        showError("資産種別データの取得に失敗しました");
      }
      setLoading(false);
    };

    void fetchAssetType();
  }, [open, id]);

  const onSubmit = async (values: AssetTypeFormValues) => {
    setLoading(true);

    if (id) {
      const updated = await updateAssetType({
        id,
        name: values.name,
        description: values.description,
        sortOrder: values.sortOrder,
      });
      setLoading(false);
      if (updated) {
        showSuccess("資産種別を更新しました");
        onClose();
        return;
      }
      showError("資産種別の更新に失敗しました");
      return;
    }

    const payload: AssetTypeCreateInput = {
      code: values.code,
      name: values.name,
      description: values.description,
      sortOrder: values.sortOrder,
    };

    const created = await createAssetType(payload);
    setLoading(false);
    if (created) {
      showSuccess("資産種別を登録しました");
      onClose();
      return;
    }
    showError("資産種別の登録に失敗しました");
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Typography variant="h6" fontWeight={700}>
          {id ? "資産種別編集" : "資産種別登録"}
        </Typography>
      </DialogTitle>
      <Box component="form" onSubmit={handleSubmit(onSubmit)}>
        <DialogContent>
          <Stack spacing={2.5}>
            <Controller
              name="code"
              control={control}
              render={({ field, fieldState }) => (
                <TextField
                  {...field}
                  required
                  label="コード"
                  placeholder="LAPTOP"
                  fullWidth
                  disabled={id !== null && id !== undefined}
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
                  placeholder="ノートPC"
                  fullWidth
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
                  placeholder="資産種別の説明"
                  fullWidth
                  multiline
                  minRows={2}
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
        <DialogActions>
          <Button onClick={onClose} color="inherit" disabled={loading}>
            キャンセル
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={loading}
            startIcon={loading ? <CircularProgress size={16} color="inherit" /> : undefined}
          >
            {id ? "更新" : "登録"}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}
