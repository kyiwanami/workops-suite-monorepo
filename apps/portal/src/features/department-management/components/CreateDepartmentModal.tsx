import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  TextField,
  Typography,
} from "@mui/material";
import { NumberField } from "@base-ui/react/number-field";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  type DepartmentType,
  type CreateDepartmentInput,
  type UpdateDepartmentInput,
} from "../types";
import {
  createDepartmentFormSchema,
  type CreateDepartmentFormValues,
} from "../schemas/createDepartmentFormSchema";

interface CreateDepartmentModalProps {
  open: boolean;
  onClose: () => void;
  department?: DepartmentType | null;
  createDepartment: (
    input: CreateDepartmentInput
  ) => Promise<DepartmentType | null>;
  updateDepartment: (
    input: UpdateDepartmentInput
  ) => Promise<DepartmentType | null>;
}

const createFormValues = (
  department?: DepartmentType | null
): CreateDepartmentFormValues => ({
  code: department?.code ?? "",
  name: department?.name ?? "",
  sortOrder: department?.sortOrder ?? 0,
  notes: department?.notes ?? "",
});

export const CreateDepartmentModal = ({
  open,
  onClose,
  department,
  createDepartment,
  updateDepartment,
}: CreateDepartmentModalProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditMode = department != null;

  const { control, handleSubmit, reset } = useForm<CreateDepartmentFormValues>({
    resolver: zodResolver(createDepartmentFormSchema),
    mode: "onSubmit",
    reValidateMode: "onSubmit",
    defaultValues: createFormValues(department),
  });

  useEffect(() => {
    if (open) {
      reset(createFormValues(department));
      return;
    }

    reset(createFormValues());
  }, [open, department]);

  const handleClose = () => {
    reset(createFormValues());
    onClose();
  };

  const onSubmit = async (values: CreateDepartmentFormValues) => {
    setIsSubmitting(true);
    try {
      const createInput: CreateDepartmentInput = {
        code: values.code,
        name: values.name,
        sortOrder: values.sortOrder,
        notes: values.notes,
      };
      const updateInput: UpdateDepartmentInput = {
        code: department?.code ?? "",
        name: values.name,
        sortOrder: values.sortOrder,
        notes: values.notes,
      };

      const result =
        isEditMode && department
          ? await updateDepartment(updateInput)
          : await createDepartment(createInput);

      if (result) {
        reset(createFormValues());
        onClose();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const dialogTitle = isEditMode ? "部署を編集" : "新規部署を作成";
  const submitLabel = isEditMode ? "更新する" : "作成する";
  const submittingLabel = isEditMode ? "更新中..." : "作成中...";
  const noticeText = isEditMode
    ? "部署コードは変更できません。更新対象は部署名・表示順・備考です。"
    : "部署コードは作成後に変更できません。慎重に設定してください。";

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{ sx: { borderRadius: 3 } }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Typography variant="h6" fontWeight={600}>
          {dialogTitle}
        </Typography>
      </DialogTitle>
      <Divider />
      <DialogContent sx={{ pt: 3 }}>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
          <Alert
            severity="info"
            variant="outlined"
            sx={{ borderRadius: 2, fontSize: "0.8rem" }}
          >
            {noticeText}
          </Alert>

          <Controller
            name="code"
            control={control}
            render={({ field, fieldState }) => (
              <TextField
                {...field}
                label="部署コード"
                onChange={(event) => field.onChange(event.target.value.toUpperCase())}
                placeholder="SALES"
                fullWidth
                required
                error={!!fieldState.error}
                helperText={fieldState.error?.message}
                disabled={isSubmitting || isEditMode}
                inputProps={{ style: { fontFamily: "monospace", fontWeight: 600 } }}
              />
            )}
          />

          <Controller
            name="name"
            control={control}
            render={({ field, fieldState }) => (
              <TextField
                {...field}
                label="部署名"
                placeholder="営業部"
                fullWidth
                required
                error={!!fieldState.error}
                helperText={fieldState.error?.message}
                disabled={isSubmitting}
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
                  value={field.value}
                  min={0}
                  step={1}
                  name={field.name}
                  disabled={isSubmitting}
                  inputRef={field.ref}
                  onValueChange={field.onChange}
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
                  <Typography variant="caption" color="error" sx={{ mt: 0.5, display: "block" }}>
                    {fieldState.error.message}
                  </Typography>
                )}
              </Box>
            )}
          />

          <Controller
            name="notes"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label="備考"
                fullWidth
                multiline
                rows={2}
                placeholder="運用メモなど"
                disabled={isSubmitting}
              />
            )}
          />
        </Box>
      </DialogContent>
      <Divider />
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={handleClose} disabled={isSubmitting} color="inherit">
          キャンセル
        </Button>
        <Button
          onClick={handleSubmit(onSubmit)}
          variant="contained"
          disabled={isSubmitting}
          disableElevation
          startIcon={
            isSubmitting ? <CircularProgress size={16} color="inherit" /> : null
          }
          sx={{ borderRadius: 2, minWidth: 120 }}
        >
          {isSubmitting ? submittingLabel : submitLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
