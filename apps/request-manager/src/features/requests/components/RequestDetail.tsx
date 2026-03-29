import { useState } from "react";
import {
  Box,
  Breadcrumbs,
  Button,
  Card,
  Chip,
  CircularProgress,
  Link,
  Stack,
  Typography,
} from "@mui/material";
import { useAbility } from "@casl/react";
import { useNavigate, useParams } from "react-router-dom";
import { AbilityContext } from "../../../shared/auth/ability";
import { useRequest } from "../hooks/useRequest";
import { useRequestTypes } from "../hooks/useRequestTypes";
import { REQUEST_STATUS_MAP, REQUEST_STATUS_CHIP_COLOR } from "../constants";
import { isTerminalState } from "../workflow";
import { ConfirmDialog } from "../../../shared/components/ConfirmDialog";
import { ReasonDialog } from "./ReasonDialog";
import { RequestFormDialog } from "./RequestForm";
import { useAuth } from "../../../shared/auth/useAuth";
import { useNotification } from "../../../shared/notification";

export function RequestDetail() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const ability = useAbility(AbilityContext);

  const {
    request,
    loading,
    submitRequest,
    withdrawRequest,
    resubmitRequest,
    approveRequest,
    rejectRequest,
    returnRequest,
  } = useRequest(id);
  const { userInfo } = useAuth();
  const { requestTypes } = useRequestTypes();
  const { showSuccess, showError } = useNotification();

  const [editOpen, setEditOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  type ConfirmAction = "submit" | "withdraw" | "resubmit" | "approve";
  type ReasonAction = "reject" | "return";

  const [confirmDialogOpen, setConfirmDialogOpen] = useState<{
    open: boolean;
    action?: ConfirmAction;
  }>({ open: false });
  const [reasonDialogOpen, setReasonDialogOpen] = useState<{
    open: boolean;
    action?: ReasonAction;
  }>({ open: false });

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!request) {
    return (
      <Box>
        <Typography color="error" sx={{ mb: 2 }}>
          申請が見つかりません
        </Typography>
        <Link
          component="button"
          onClick={() => navigate("/requests")}
          sx={{ cursor: "pointer" }}
        >
          申請一覧に戻る
        </Link>
      </Box>
    );
  }

  const requestType = requestTypes.find((rt) => rt.id === request.requestTypeId);
  const terminal = isTerminalState(request.status);

  const canUpdateRequest = ability.can("update", request);
  const canSubmitRequestAbility = ability.can("submit", request);
  const canWithdrawRequestAbility = ability.can("withdraw", request);
  const canApproveRequestAbility = ability.can("approve", request);
  const canRejectRequestAbility = ability.can("reject", request);
  const canReturnRequestAbility = ability.can("return", request);

  const canEdit =
    canUpdateRequest && (request.status === "draft" || request.status === "returned");
  const canSubmit =
    canSubmitRequestAbility && (request.status === "draft" || request.status === "returned");
  const canWithdraw =
    canWithdrawRequestAbility &&
    (request.status === "draft" ||
      request.status === "returned" ||
      request.status === "submitted");
  const canResubmit = canSubmitRequestAbility && request.status === "returned";
  const canApprove = canApproveRequestAbility && request.status === "submitted";
  const canReject = canRejectRequestAbility && request.status === "submitted";
  const canReturn = canReturnRequestAbility && request.status === "submitted";

  const handleConfirmAction = async (action: ConfirmAction) => {
    setActionLoading(true);
    let result = null;
    if (action === "submit") {
      result = await submitRequest();
    } else if (action === "withdraw") {
      result = await withdrawRequest();
    } else if (action === "resubmit") {
      result = await resubmitRequest();
    } else if (action === "approve") {
      if (!userInfo.userId) {
        console.error("Request approve validation error", "ユーザー情報が取得できません");
        showError("ユーザー情報が取得できません");
        setActionLoading(false);
        setConfirmDialogOpen({ open: false });
        return;
      }
      result = await approveRequest(userInfo.userId);
    }
    setActionLoading(false);
    if (result) {
      showSuccess(`申請を${action === "submit" ? "提出" : action === "withdraw" ? "取り下げ" : action === "resubmit" ? "再提出" : "承認"}しました`);
    }
    setConfirmDialogOpen({ open: false });
  };

  const handleReasonAction = async (reason: string, action: ReasonAction) => {
    setActionLoading(true);
    const result =
      action === "reject"
        ? await rejectRequest(reason)
        : await returnRequest(reason);
    setActionLoading(false);
    if (result) {
      showSuccess(
        `申請を${action === "reject" ? "却下" : "差戻し"}しました`,
      );
    }
    setReasonDialogOpen({ open: false });
  };

  return (
    <Box>
      <Breadcrumbs sx={{ mb: 3 }}>
        <Link
          component="button"
          onClick={() => navigate("/requests")}
          sx={{ cursor: "pointer" }}
        >
          申請一覧
        </Link>
        <Typography color="text.primary">申請詳細</Typography>
      </Breadcrumbs>

      <Card sx={{ p: 3, mb: 3 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={3}>
          <Typography variant="h6" fontWeight={600}>
            申請情報
          </Typography>
          {!terminal && (
            <Stack direction="row" spacing={1}>
              {canEdit && (
                <Button
                  size="small"
                  onClick={() => setEditOpen(true)}
                >
                  編集
                </Button>
              )}
              {(canSubmit || canResubmit) && (
                <Button
                  size="small"
                  variant="contained"
                  onClick={() =>
                    setConfirmDialogOpen({
                      open: true,
                      action: canResubmit ? "resubmit" : "submit",
                    })
                  }
                  disabled={actionLoading}
                >
                  {canResubmit ? "再提出" : "提出"}
                </Button>
              )}
              {canWithdraw && (
                <Button
                  size="small"
                  color="error"
                  onClick={() =>
                    setConfirmDialogOpen({ open: true, action: "withdraw" })
                  }
                  disabled={actionLoading}
                >
                  取り下げ
                </Button>
              )}
              {canApprove && (
                <Button
                  size="small"
                  variant="contained"
                  color="success"
                  onClick={() =>
                    setConfirmDialogOpen({ open: true, action: "approve" })
                  }
                  disabled={actionLoading}
                >
                  承認
                </Button>
              )}
              {canReject && (
                <Button
                  size="small"
                  color="error"
                  onClick={() =>
                    setReasonDialogOpen({ open: true, action: "reject" })
                  }
                  disabled={actionLoading}
                >
                  却下
                </Button>
              )}
              {canReturn && (
                <Button
                  size="small"
                  color="warning"
                  onClick={() =>
                    setReasonDialogOpen({ open: true, action: "return" })
                  }
                  disabled={actionLoading}
                >
                  差戻し
                </Button>
              )}
            </Stack>
          )}
        </Stack>

        <Stack spacing={3}>
          <Stack spacing={0.5}>
            <Typography variant="caption" color="text.secondary">
              申請種別
            </Typography>
            <Typography variant="body2">{requestType?.name ?? "-"}</Typography>
          </Stack>
          <Stack spacing={0.5}>
            <Typography variant="caption" color="text.secondary">
              ステータス
            </Typography>
            <Box>
              <Chip
                label={REQUEST_STATUS_MAP[request.status] ?? request.status}
                size="small"
                color={REQUEST_STATUS_CHIP_COLOR[request.status]}
                variant="filled"
              />
            </Box>
          </Stack>
          <Stack spacing={0.5}>
            <Typography variant="caption" color="text.secondary">
              タイトル
            </Typography>
            <Typography variant="body2">{request.title}</Typography>
          </Stack>
          <Stack spacing={0.5}>
            <Typography variant="caption" color="text.secondary">
              金額
            </Typography>
            <Typography variant="body2">
              ¥{request.amount.toLocaleString("ja-JP")}
            </Typography>
          </Stack>
          <Stack spacing={0.5}>
            <Typography variant="caption" color="text.secondary">
              説明
            </Typography>
            <Typography variant="body2">{request.description ?? "-"}</Typography>
          </Stack>
          <Stack spacing={0.5}>
            <Typography variant="caption" color="text.secondary">
              作成日
            </Typography>
            <Typography variant="body2">
              {request.createdAt
                ? new Date(request.createdAt).toLocaleDateString("ja-JP")
                : "-"}
            </Typography>
          </Stack>
          <Stack spacing={0.5}>
            <Typography variant="caption" color="text.secondary">
              提出日
            </Typography>
            <Typography variant="body2">
              {request.submittedAt
                ? new Date(request.submittedAt).toLocaleDateString("ja-JP")
                : "-"}
            </Typography>
          </Stack>
          {request.approverSub && (
            <Stack spacing={0.5}>
              <Typography variant="caption" color="text.secondary">
                承認者
              </Typography>
              <Typography variant="body2">{request.approverSub}</Typography>
            </Stack>
          )}
          {request.rejectionReason && (
            <Stack spacing={0.5}>
              <Typography variant="caption" color="text.secondary">
                却下理由
              </Typography>
              <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
                {request.rejectionReason}
              </Typography>
            </Stack>
          )}
          {request.returnReason && (
            <Stack spacing={0.5}>
              <Typography variant="caption" color="text.secondary">
                差戻し理由
              </Typography>
              <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
                {request.returnReason}
              </Typography>
            </Stack>
          )}
        </Stack>
      </Card>

      {canUpdateRequest && (
        <RequestFormDialog id={id} open={editOpen} onClose={() => setEditOpen(false)} />
      )}

      <ConfirmDialog
        open={confirmDialogOpen.open && (canSubmit || canWithdraw || canResubmit || canApprove)}
        title={
          confirmDialogOpen.action === "submit"
            ? "申請を提出しますか？"
            : confirmDialogOpen.action === "withdraw"
              ? "申請を取り下げますか？"
              : confirmDialogOpen.action === "resubmit"
                ? "申請を再提出しますか？"
                : "申請を承認しますか？"
        }
        message={
          confirmDialogOpen.action === "submit"
            ? "提出後は内容が変更できません。よろしいですか？"
            : confirmDialogOpen.action === "withdraw"
              ? "この操作は取り消せません。よろしいですか？"
              : confirmDialogOpen.action === "resubmit"
                ? "申請を再度提出します。よろしいですか？"
                : "この申請を承認します。よろしいですか？"
        }
        onConfirm={() =>
          handleConfirmAction(confirmDialogOpen.action || "submit")
        }
        onCancel={() => setConfirmDialogOpen({ open: false })}
        loading={actionLoading}
        confirmLabel={
          confirmDialogOpen.action === "submit" || confirmDialogOpen.action === "resubmit"
            ? "提出"
            : confirmDialogOpen.action === "withdraw"
              ? "取り下げ"
              : "承認"
        }
      />

      <ReasonDialog
        open={reasonDialogOpen.open && (canReject || canReturn)}
        title={
          reasonDialogOpen.action === "reject"
            ? "申請を却下しますか？"
            : "申請を差戻しますか？"
        }
        onClose={() => setReasonDialogOpen({ open: false })}
        onConfirm={(reason) =>
          handleReasonAction(reason, reasonDialogOpen.action || "reject")
        }
        loading={actionLoading}
      />
    </Box>
  );
}
