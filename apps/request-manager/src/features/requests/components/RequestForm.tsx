import { useEffect, useState } from "react";
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { NumberField } from "@base-ui/react/number-field";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAbility } from "@casl/react";
import { useRequest } from "../hooks/useRequest";
import { useRequestTypes } from "../hooks/useRequestTypes";
import { useAuth } from "@workops-suite/shared-auth";
import { useNotification } from "@workops-suite/shared-notification";
import { AbilityContext } from "../../../shared/auth/ability";
import {
  requestFormSchema,
  type RequestFormSubmitValues,
  type RequestFormValues,
} from "../schemas/requestFormSchema";

type RequestFormDialogProps = {
  open: boolean;
  onClose: () => void;
  id?: string | null;
};

const defaultValues: RequestFormValues = {
  requestTypeId: "",
  title: "",
  description: "",
  amount: null,
};

export function RequestFormDialog({
  open,
  onClose,
  id,
}: RequestFormDialogProps) {
  const requestId = id ?? undefined;
  const { request, createRequest, updateRequest, submitRequest } = useRequest(requestId);
  const { requestTypes, loading: requestTypesLoading } = useRequestTypes();
  const { showError, showSuccess } = useNotification();
  const { userInfo } = useAuth();
  const ability = useAbility(AbilityContext);

  const [loading, setLoading] = useState(false);
  const canCreateRequest = ability.can("create", "Request");
  const canUpdateRequest = ability.can("update", "Request");
  const canSubmitRequestAbility = ability.can("submit", "Request");
  const canPersist = id ? canUpdateRequest : canCreateRequest;

  const { control, handleSubmit, reset } = useForm<RequestFormValues, undefined, RequestFormSubmitValues>({
    resolver: zodResolver(requestFormSchema),
    mode: "onSubmit",
    reValidateMode: "onSubmit",
    defaultValues,
  });

  useEffect(() => {
    if (!open) {
      return;
    }

    if (!id || !request) {
      reset(defaultValues);
      return;
    }

    reset({
      requestTypeId: request.requestTypeId,
      title: request.title,
      description: request.description,
      amount: request.amount,
    });
  }, [open, id, request]);

  const handlePersist = async (
    values: RequestFormSubmitValues,
    shouldSubmit: boolean,
  ) => {
    if (!canPersist) {
      showError("申請の編集権限がありません");
      return;
    }

    if (shouldSubmit && !canSubmitRequestAbility) {
      showError("申請の提出権限がありません");
      return;
    }

    if (!userInfo.userId || !userInfo.departmentCode) {
      showError("ユーザー情報が取得できません");
      return;
    }

    setLoading(true);

    let stored = null;
    if (id && request) {
      stored = await updateRequest({
        id,
        departmentId: userInfo.departmentCode,
        requesterSub: userInfo.userId,
        requestTypeId: values.requestTypeId,
        title: values.title,
        description: values.description,
        amount: values.amount,
        status: request.status,
      });
    } else {
      stored = await createRequest({
        departmentId: userInfo.departmentCode,
        requesterSub: userInfo.userId,
        requestTypeId: values.requestTypeId,
        title: values.title,
        description: values.description,
        amount: values.amount,
      });
    }

    if (!stored) {
      setLoading(false);
      if (shouldSubmit) {
        showError("申請の提出に失敗しました");
      } else {
        showError(id ? "申請の保存に失敗しました" : "申請の作成に失敗しました");
      }
      return;
    }

    if (!shouldSubmit) {
      showSuccess("申請を保存しました");
      onClose();
      setLoading(false);
      return;
    }

    let submitted = null;
    submitted = await submitRequest();

    if (submitted) {
      showSuccess("申請を提出しました");
      onClose();
    } else {
      showError("申請の提出に失敗しました");
    }

    setLoading(false);
  };

  const onSaveDraft = async (values: RequestFormSubmitValues) => {
    await handlePersist(values, false);
  };

  const onSubmitRequest = async (values: RequestFormSubmitValues) => {
    await handlePersist(values, true);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Typography component="span" variant="h6" fontWeight={600}>
          {id ? "申請を編集" : "新規申請"}
        </Typography>
      </DialogTitle>
      <Box component="form" onSubmit={handleSubmit(onSubmitRequest)}>
        <DialogContent>
          <Stack spacing={2.5} sx={{ pt: 1 }}>
            <Controller
              name="requestTypeId"
              control={control}
              render={({ field, fieldState }) => (
                <>
                  <Select
                    value={field.value}
                    onChange={(event) => field.onChange(event.target.value)}
                    fullWidth
                    disabled={requestTypesLoading || loading}
                    error={!!fieldState.error}
                  >
                    <MenuItem value="" disabled>
                      申請種別を選択
                    </MenuItem>
                    {requestTypes
                      .filter((rt) => rt.isActive)
                      .map((rt) => (
                        <MenuItem key={rt.id} value={rt.id}>
                          {rt.name}
                        </MenuItem>
                      ))}
                  </Select>
                  {fieldState.error?.message && (
                    <Typography color="error" variant="caption">
                      {fieldState.error.message}
                    </Typography>
                  )}
                </>
              )}
            />

            <Controller
              name="title"
              control={control}
              render={({ field, fieldState }) => (
                <TextField
                  {...field}
                  required
                  label="タイトル"
                  placeholder="申請タイトル"
                  fullWidth
                  disabled={loading}
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
                  placeholder="申請内容の詳細"
                  fullWidth
                  multiline
                  rows={3}
                  disabled={loading}
                />
              )}
            />

            <Controller
              name="amount"
              control={control}
              render={({ field, fieldState }) => (
                <Box>
                  <Typography variant="body2" sx={{ mb: 0.5 }}>
                    金額
                  </Typography>
                  <NumberField.Root
                    value={field.value ?? null}
                    step={1}
                    name={field.name}
                    inputRef={field.ref}
                    disabled={loading}
                    onValueChange={(value) => field.onChange(value)}
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
                        placeholder="10000"
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
          {canPersist && (
            <Button
              onClick={handleSubmit(onSaveDraft)}
              disabled={loading}
              startIcon={
                loading ? <CircularProgress size={16} color="inherit" /> : undefined
              }
            >
              下書き保存
            </Button>
          )}
          {canPersist && canSubmitRequestAbility && (
            <Button
              type="submit"
              variant="contained"
              disabled={loading}
              startIcon={
                loading ? <CircularProgress size={16} color="inherit" /> : undefined
              }
            >
              提出
            </Button>
          )}
        </DialogActions>
      </Box>
    </Dialog>
  );
}
