import { useEffect, useState } from "react";
import { generateClient } from "aws-amplify/data";
import type { Schema } from "@workops/data-schema";
import { useNotification } from "../../../shared/notification";

const client = generateClient<Schema>();

export type Request = Schema["Request"]["type"];

export function useRequests(departmentId: string) {
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const { showError } = useNotification();

  const fetchAllRequests = async () => {
    const allRequests: Request[] = [];
    let varNextToken: string | null | undefined;

    do {
      const { data, errors, nextToken } =
        await client.models.Request.listRequestByDepartmentIdAndStatus(
          { departmentId },
          { limit: 1000, nextToken: varNextToken ?? undefined },
        );

      if (errors) {
        console.error("Request list by departmentId error", errors);
        showError("申請一覧の取得に失敗しました");
        setLoading(false);
        return;
      }

      allRequests.push(...(data ?? []));
      varNextToken = nextToken;
    } while (varNextToken);

    allRequests.sort((left, right) => {
      const leftTime = left.createdAt ? new Date(left.createdAt).getTime() : 0;
      const rightTime = right.createdAt ? new Date(right.createdAt).getTime() : 0;
      return rightTime - leftTime;
    });

    setRequests(allRequests);
    setLoading(false);
  };

  useEffect(() => {
    void fetchAllRequests();

    const subCreate = client.models.Request.onCreate().subscribe({
      next: () => {
        void fetchAllRequests();
      },
      error: (error) => {
        console.error("Request onCreate subscription error", error);
        showError("申請一覧の監視に失敗しました");
      },
    });

    const subUpdate = client.models.Request.onUpdate().subscribe({
      next: () => {
        void fetchAllRequests();
      },
      error: (error) => {
        console.error("Request onUpdate subscription error", error);
        showError("申請一覧の監視に失敗しました");
      },
    });

    return () => {
      subCreate.unsubscribe();
      subUpdate.unsubscribe();
    };
  }, [departmentId]);

  return { requests, loading };
}

export function useMyRequests(requesterSub: string) {
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const { showError } = useNotification();

  const fetchMyRequests = async () => {
    const allRequests: Request[] = [];
    let varNextToken: string | null | undefined;

    do {
      const { data, errors, nextToken } =
        await client.models.Request.listRequestByRequesterSubAndStatus(
          { requesterSub },
          { limit: 1000, nextToken: varNextToken ?? undefined },
        );

      if (errors) {
        console.error("Request list by requesterSub error", errors);
        showError("自分の申請一覧の取得に失敗しました");
        setLoading(false);
        return;
      }

      allRequests.push(...(data ?? []));
      varNextToken = nextToken;
    } while (varNextToken);

    allRequests.sort((left, right) => {
      const leftTime = left.createdAt ? new Date(left.createdAt).getTime() : 0;
      const rightTime = right.createdAt ? new Date(right.createdAt).getTime() : 0;
      return rightTime - leftTime;
    });

    setRequests(allRequests);
    setLoading(false);
  };

  useEffect(() => {
    void fetchMyRequests();

    const subCreate = client.models.Request.onCreate().subscribe({
      next: () => {
        void fetchMyRequests();
      },
      error: (error) => {
        console.error("MyRequest onCreate subscription error", error);
        showError("申請一覧の監視に失敗しました");
      },
    });

    const subUpdate = client.models.Request.onUpdate().subscribe({
      next: () => {
        void fetchMyRequests();
      },
      error: (error) => {
        console.error("MyRequest onUpdate subscription error", error);
        showError("申請一覧の監視に失敗しました");
      },
    });

    return () => {
      subCreate.unsubscribe();
      subUpdate.unsubscribe();
    };
  }, [requesterSub]);

  return { requests, loading };
}
