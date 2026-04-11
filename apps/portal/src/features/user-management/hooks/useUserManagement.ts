import { useState, useCallback } from "react";
import { generateClient } from "aws-amplify/data";
import type { Schema } from "@workops/data-schema";
import { useNotification } from "@workops-suite/shared-notification";
import {
  type CognitoUserType,
  type UserDetailType,
  type CognitoGroupType,
  type CreateUserArguments,
  type SetUserEnabledArguments,
  type DeleteUserArguments,
} from "../types";

const client = generateClient<Schema>();

export const useUserManagement = () => {
  const [users, setUsers] = useState<CognitoUserType[]>([]);
  const [loading, setLoading] = useState(false);
  const { showError, showSuccess } = useNotification();

  /**
   * ユーザー一覧を取得
   */
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    const result = await client.queries.listUsers();

    if (result.errors?.length) {
      console.error("GraphQL errors in fetchUsers:", result.errors);
      showError("ユーザー情報の取得に失敗しました");
      setUsers([]);
      setLoading(false);
      return;
    }

    if (result.data) {
      // null/undefinedを除外して型安全にする
      const validUsers = result.data.filter(
        (u): u is CognitoUserType => u !== null && u !== undefined
      );
      setUsers(validUsers);
    } else {
      setUsers([]);
    }
    setLoading(false);
  }, [showError]);

  /**
   * ユーザー詳細を取得
   */
  const fetchUserDetail = useCallback(
    async (username: string): Promise<UserDetailType | null> => {
      const result = await client.queries.getUser({ username });

      if (result.errors?.length) {
        console.error("GraphQL errors in fetchUserDetail:", result.errors);
        showError("ユーザー詳細情報の取得に失敗しました");
        return null;
      }

      if (result.data) {
        const userDetail = result.data;
        return userDetail;
      }
      return null;
    },
    [showError]
  );

  /**
   * 新規ユーザーを作成
   */
  const createUser = useCallback(
    async (input: CreateUserArguments): Promise<CognitoUserType | null> => {
      setLoading(true);
      const result = await client.mutations.createUser(input);

      if (result.errors?.length) {
        console.error("GraphQL errors in createUser:", result.errors);
        showError("ユーザー作成に失敗しました");
        setLoading(false);
        return null;
      }

      if (result.data) {
        showSuccess(`ユーザー「${input.username}」を作成しました`);
        setLoading(false);
        return result.data;
      }
      showError("ユーザー作成に失敗しました");
      setLoading(false);
      return null;
    },
    [showSuccess, showError]
  );

  /**
   * ユーザーの有効/無効状態を設定
   */
  const setUserEnabled = useCallback(
    async (params: SetUserEnabledArguments): Promise<boolean> => {
      setLoading(true);
      const result = await client.mutations.setUserEnabled(params);

      if (result.errors?.length) {
        console.error("GraphQL errors in setUserEnabled:", result.errors);
        showError("ユーザー状態の変更に失敗しました");
        setLoading(false);
        return false;
      }

      if (result.data) {
        const action = params.enabled ? "有効化" : "無効化";
        showSuccess(`ユーザー「${params.username}」を${action}しました`);
        setLoading(false);
        return true;
      }
      const action = params.enabled ? "有効化" : "無効化";
      showError(`ユーザー「${params.username}」の${action}に失敗しました`);
      setLoading(false);
      return false;
    },
    [showSuccess, showError]
  );

  /**
   * ユーザーを削除
   */
  const deleteUser = useCallback(
    async (params: DeleteUserArguments): Promise<boolean> => {
      setLoading(true);
      const result = await client.mutations.deleteUser(params);

      if (result.errors?.length) {
        console.error("GraphQL errors in deleteUser:", result.errors);
        showError("ユーザー削除に失敗しました");
        setLoading(false);
        return false;
      }

      if (result.data) {
        showSuccess(`ユーザー「${params.username}」を削除しました`);
        setLoading(false);
        return true;
      }
      showError(`ユーザー「${params.username}」の削除に失敗しました`);
      setLoading(false);
      return false;
    },
    [showSuccess, showError]
  );

  /**
   * ユーザーが所属するグループ一覧を取得
   */
  const fetchGroupsForUser = useCallback(
    async (username: string): Promise<CognitoGroupType[]> => {
      const result = await client.queries.listGroupsForUser({ username });
      if (result.errors?.length) {
        console.error("GraphQL errors in fetchGroupsForUser:", result.errors);
        showError("グループ情報の取得に失敗しました");
        return [];
      }
      if (result.data) {
        return result.data.filter(
          (g): g is CognitoGroupType => g !== null && g !== undefined
        );
      }
      return [];
    },
    [showError]
  );

  /**
   * 全グループ一覧を取得
   */
  const fetchAllGroups = useCallback(async (): Promise<CognitoGroupType[]> => {
    const result = await client.queries.listGroups();
    if (result.errors?.length) {
      console.error("GraphQL errors in fetchAllGroups:", result.errors);
      showError("グループ一覧の取得に失敗しました");
      return [];
    }
    if (result.data) {
      const groups = result.data.filter(
        (g): g is CognitoGroupType => g !== null && g !== undefined
      );
      return [...groups].sort((a, b) => a.groupName.localeCompare(b.groupName));
    }
    return [];
  }, [showError]);

  /**
   * ユーザーのグループを変更する（旧グループから外して新グループに追加）
   * admin グループは remove の対象外
   */
  const assignUserGroup = useCallback(
    async (
      username: string,
      newGroupName: string,
      oldGroupName: string | null
    ): Promise<boolean> => {
      setLoading(true);
      if (oldGroupName && oldGroupName !== "admin") {
        const removeResult = await client.mutations.removeUserFromGroup({
          username,
          groupName: oldGroupName,
        });
        if (removeResult.errors?.length) {
          console.error(
            "GraphQL errors in assignUserGroup (removeUserFromGroup):",
            removeResult.errors
          );
          showError("グループ割り当てに失敗しました");
          setLoading(false);
          return false;
        }
      }
      const addResult = await client.mutations.addUserToGroup({
        username,
        groupName: newGroupName,
      });
      if (addResult.errors?.length) {
        console.error(
          "GraphQL errors in assignUserGroup (addUserToGroup):",
          addResult.errors
        );
        showError("グループ割り当てに失敗しました");
        setLoading(false);
        return false;
      }
      showSuccess(
        `ユーザー「${username}」のグループを「${newGroupName}」に設定しました`
      );
      setLoading(false);
      return true;
    },
    [showSuccess, showError]
  );

  return {
    users,
    loading,
    fetchUsers,
    fetchUserDetail,
    createUser,
    setUserEnabled,
    deleteUser,
    fetchGroupsForUser,
    fetchAllGroups,
    assignUserGroup,
  };
};
