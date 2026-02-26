import { useEffect } from "react";
import {
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
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  reasonFormSchema,
  type ReasonFormValues,
} from "../schemas/reasonFormSchema";

type ReasonDialogProps = {
  open: boolean;
  title: string;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  loading?: boolean;
};

const defaultValues: ReasonFormValues = {
  reason: "",
};

export function ReasonDialog({
  open,
  title,
  onClose,
  onConfirm,
  loading,
}: ReasonDialogProps) {
  const isLoading = loading === true;

  const { control, handleSubmit, reset } = useForm<ReasonFormValues>({
    resolver: zodResolver(reasonFormSchema),
    mode: "onSubmit",
    reValidateMode: "onSubmit",
    defaultValues,
  });

  useEffect(() => {
    if (open) {
      reset(defaultValues);
    }
  }, [open]);

  const handleClose = () => {
    reset(defaultValues);
    onClose();
  };

  const onSubmit = (values: ReasonFormValues) => {
    onConfirm(values.reason);
    reset(defaultValues);
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Typography component="span" variant="h6" fontWeight={600}>
          {title}
        </Typography>
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 2 }}>
          <Controller
            name="reason"
            control={control}
            render={({ field, fieldState }) => (
              <TextField
                {...field}
                label="理由"
                multiline
                rows={4}
                placeholder="理由を入力してください"
                fullWidth
                autoFocus
                disabled={isLoading}
                error={!!fieldState.error}
                helperText={fieldState.error?.message}
              />
            )}
          />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button onClick={handleClose} color="inherit" disabled={isLoading}>
          キャンセル
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit(onSubmit)}
          disabled={isLoading}
          startIcon={
            isLoading ? <CircularProgress size={16} color="inherit" /> : undefined
          }
        >
          確認
        </Button>
      </DialogActions>
    </Dialog>
  );
}
