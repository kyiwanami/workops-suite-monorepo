import { useEffect, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  CircularProgress,
  Typography,
  Alert,
} from "@mui/material";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useUserManagement } from "../hooks/useUserManagement";
import { type CreateUserArguments } from "../types";
import {
  createUserFormSchema,
  type CreateUserFormValues,
} from "../schemas/createUserFormSchema";

interface CreateUserModalProps {
  open: boolean;
  onClose: (success?: boolean) => void;
}

const defaultValues: CreateUserFormValues = {
  username: "",
  email: "",
};

export const CreateUserModal = ({ open, onClose }: CreateUserModalProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { createUser } = useUserManagement();

  const { control, handleSubmit, reset } = useForm<CreateUserFormValues>({
    resolver: zodResolver(createUserFormSchema),
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
    onClose(false);
  };

  const onSubmit = async (values: CreateUserFormValues) => {
    setIsSubmitting(true);
    try {
      const params: CreateUserArguments = {
        username: values.username,
        email: values.email,
      };

      const result = await createUser(params);

      if (result) {
        reset(defaultValues);
        onClose(true);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>新規ユーザー作成</DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 2, display: "flex", flexDirection: "column", gap: 2 }}>
          <Alert severity="info" sx={{ mb: 1 }}>
            ユーザー作成後、登録したメールアドレスに一時パスワードが記載された招待メールが自動送信されます。
          </Alert>

          <Controller
            name="username"
            control={control}
            render={({ field, fieldState }) => (
              <TextField
                {...field}
                label="ユーザー名"
                placeholder="taro.yamada"
                fullWidth
                required
                error={!!fieldState.error}
                helperText={fieldState.error?.message}
                disabled={isSubmitting}
              />
            )}
          />

          <Controller
            name="email"
            control={control}
            render={({ field, fieldState }) => (
              <TextField
                {...field}
                label="メールアドレス"
                type="email"
                placeholder="taro@example.com"
                fullWidth
                required
                error={!!fieldState.error}
                helperText={fieldState.error?.message}
                disabled={isSubmitting}
              />
            )}
          />

          <Typography variant="caption" color="text.secondary">
            ※一時パスワードはメールで送信されます。初回ログイン時にパスワード変更が必要です。
          </Typography>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={isSubmitting}>
          キャンセル
        </Button>
        <Button
          onClick={handleSubmit(onSubmit)}
          variant="contained"
          disabled={isSubmitting}
          startIcon={isSubmitting ? <CircularProgress size={20} /> : undefined}
        >
          {isSubmitting ? "作成中..." : "ユーザーを作成"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
