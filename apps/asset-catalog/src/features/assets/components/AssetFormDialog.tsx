import { useEffect, useMemo, useState } from "react";
import { generateClient } from "aws-amplify/data";
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAbility } from "@casl/react";
import type { Schema } from "@workops/data-schema";
import { useDepartments } from "@workops-suite/shared-department";
import { useAsset, type AssetCreateInput } from "../hooks/useAssets";
import { useAssetTypes } from "../hooks/useAssetTypes";
import { ASSET_STATUS_MAP } from "../constants";
import { useAuth } from "@workops-suite/shared-auth";
import { useNotification } from "@workops-suite/shared-notification";
import { Can, AbilityContext } from "../../../shared/auth/ability";
import {
  buildAssetFormSchema,
  type AssetFormValues,
} from "../schemas/assetFormSchema";

const client = generateClient<Schema>();

type AssigneeOption = {
  sub: string;
  label: string;
};

type AssetFormDialogProps = {
  open: boolean;
  onClose: () => void;
  id?: string | null;
};

export function AssetFormDialog({ open, onClose, id }: AssetFormDialogProps) {
  const { getAsset, createAsset, updateAsset } = useAsset();
  const { assetTypes } = useAssetTypes();
  const { departments, loading: departmentsLoading } = useDepartments();
  const { showError, showSuccess } = useNotification();
  const { userInfo } = useAuth();
  const ability = useAbility(AbilityContext);

  const [loading, setLoading] = useState(false);
  const [assigneeLoading, setAssigneeLoading] = useState(false);
  const [assigneeOptions, setAssigneeOptions] = useState<AssigneeOption[]>([]);
  const canCreateAsset = ability.can("create", "Asset");
  const canUpdateAsset = ability.can("update", "Asset");

  const schema = useMemo(
    () => buildAssetFormSchema({ isGlobalAdmin: ability.can("read", "Department") }),
    [ability],
  );

  const defaultValues: AssetFormValues = useMemo(
    () => ({
      departmentId: userInfo.departmentCode,
      name: "",
      assetTypeId: "",
      status: "inStock",
      assigneeSub: "",
    }),
    [userInfo.departmentCode],
  );

  const { control, handleSubmit, reset } = useForm<AssetFormValues>({
    resolver: zodResolver(schema),
    mode: "onSubmit",
    reValidateMode: "onSubmit",
    defaultValues,
  });

  useEffect(() => {
    if (!open) {
      return;
    }

    const fetchAssignableUsers = async () => {
      setAssigneeLoading(true);
      const listResult = await client.queries.listUsers();

      if (listResult.errors?.length) {
        console.error("GraphQL errors in listUsers:", listResult.errors);
        showError("ユーザー一覧の取得に失敗しました");
        setAssigneeOptions([]);
        setAssigneeLoading(false);
        return;
      }

      const users =
        listResult.data?.filter(
          (user): user is NonNullable<Schema["CognitoUser"]["type"]> =>
            user !== null && user !== undefined,
        ) ?? [];

      const options = users.map((user) => {
        const email = user.email ? ` / ${user.email}` : "";
        return {
          sub: user.username,
          label: `${user.username}${email}`,
        } satisfies AssigneeOption;
      });

      setAssigneeOptions(
        options.sort((left, right) => left.label.localeCompare(right.label, "ja-JP")),
      );
      setAssigneeLoading(false);
    };

    void fetchAssignableUsers();
  }, [open]);

  useEffect(() => {
    const fetchAsset = async () => {
      if (!open) {
        return;
      }

      if (!id) {
        reset(defaultValues);
        return;
      }

      setLoading(true);
      const current = await getAsset(id);
      if (current) {
        reset({
          departmentId: current.departmentId,
          name: current.name,
          assetTypeId: current.assetTypeId,
          status: current.status,
          assigneeSub: current.assigneeSub ?? "",
        });
      } else {
        showError("資産データの取得に失敗しました");
      }
      setLoading(false);
    };

    void fetchAsset();
  }, [open, id, defaultValues]);

  const onSubmit = async (values: AssetFormValues) => {
    if (id && !canUpdateAsset) {
      showError("更新権限がありません");
      return;
    }

    if (!id && !canCreateAsset) {
      showError("登録権限がありません");
      return;
    }

    if (!values.departmentId) {
      showError("部署は必須です");
      return;
    }

    setLoading(true);

    const payload: AssetCreateInput = {
      departmentId: values.departmentId,
      name: values.name,
      assetTypeId: values.assetTypeId,
      status: values.status,
      assigneeSub: values.assigneeSub ? values.assigneeSub : null,
    };

    if (id) {
      const updated = await updateAsset({ id, ...payload });
      if (updated) {
        showSuccess("資産を更新しました");
        onClose();
      } else {
        showError("資産の更新に失敗しました");
      }
    } else {
      const created = await createAsset(payload);
      if (created) {
        showSuccess("資産を登録しました");
        onClose();
      } else {
        showError("資産の登録に失敗しました");
      }
    }

    setLoading(false);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Typography variant="h6" fontWeight={700}>
          {id ? "資産編集" : "資産登録"}
        </Typography>
      </DialogTitle>
      <Box component="form" onSubmit={handleSubmit(onSubmit)}>
        <DialogContent>
          <Stack spacing={2.5}>
            <Can I="read" a="Department">
              <Controller
                name="departmentId"
                control={control}
                render={({ field, fieldState }) => (
                  <TextField
                    {...field}
                    required
                    select
                    label="部署"
                    autoFocus
                    fullWidth
                    disabled={departmentsLoading ? true : loading}
                    error={!!fieldState.error}
                    helperText={fieldState.error?.message}
                  >
                    {departments.map((department) => (
                      <MenuItem key={department.code} value={department.code}>
                        {department.name}
                      </MenuItem>
                    ))}
                  </TextField>
                )}
              />
            </Can>

            <Controller
              name="assetTypeId"
              control={control}
              render={({ field, fieldState }) => (
                <TextField
                  {...field}
                  required
                  select
                  label="資産種別"
                  fullWidth
                  error={!!fieldState.error}
                  helperText={fieldState.error?.message}
                  disabled={loading}
                >
                  {assetTypes.map((assetType) => (
                    <MenuItem key={assetType.id} value={assetType.id}>
                      {assetType.name}
                    </MenuItem>
                  ))}
                </TextField>
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
                  error={!!fieldState.error}
                  helperText={fieldState.error?.message}
                  disabled={loading}
                />
              )}
            />

            <Controller
              name="status"
              control={control}
              render={({ field, fieldState }) => (
                <TextField
                  {...field}
                  required
                  select
                  label="状態"
                  fullWidth
                  error={!!fieldState.error}
                  helperText={fieldState.error?.message}
                  disabled={loading}
                >
                  {Object.entries(ASSET_STATUS_MAP).map(([value, label]) => (
                    <MenuItem key={value} value={value}>
                      {label}
                    </MenuItem>
                  ))}
                </TextField>
              )}
            />

            <Controller
              name="assigneeSub"
              control={control}
              render={({ field, fieldState }) => (
                <TextField
                  {...field}
                  select
                  label="利用者"
                  fullWidth
                  error={!!fieldState.error}
                  helperText={fieldState.error?.message}
                  disabled={loading || assigneeLoading}
                >
                  <MenuItem value="">未割当</MenuItem>
                  {assigneeOptions.map((option) => (
                    <MenuItem key={option.sub} value={option.sub}>
                      {option.label}
                    </MenuItem>
                  ))}
                </TextField>
              )}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} color="inherit" disabled={loading}>
            キャンセル
          </Button>
          {((id && canUpdateAsset) || (!id && canCreateAsset)) && (
            <Button
              type="submit"
              variant="contained"
              disabled={loading}
              startIcon={loading ? <CircularProgress size={16} color="inherit" /> : undefined}
            >
              {id ? "更新" : "登録"}
            </Button>
          )}
        </DialogActions>
      </Box>
    </Dialog>
  );
}
