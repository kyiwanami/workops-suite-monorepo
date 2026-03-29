import { Amplify } from "aws-amplify";
import { generateClient } from "aws-amplify/data";
import { getAmplifyDataClientConfig } from "@aws-amplify/backend/function/runtime";
import { env } from "$amplify/env/request-tool-list";
import type { Schema } from "../../../data/resource";

const { resourceConfig, libraryOptions } = await getAmplifyDataClientConfig(env);
Amplify.configure(resourceConfig, libraryOptions);

const client = generateClient<Schema>();

const INTERNAL_PAGE_LIMIT = 100;
const MAX_FETCH_PAGES = 3;

type RequestStatusCode =
  | "draft"
  | "submitted"
  | "approved"
  | "rejected"
  | "withdrawn";

interface ListRequestsInput {
  departmentId?: string;
  requesterSub?: string;
  status?: RequestStatusCode;
  requestTypeId?: string;
}

interface ListRequestsOutput {
  items: Schema["Request"]["type"][];
}

interface ListQueryResult {
  items: Schema["Request"]["type"][];
  nextToken?: string | null;
}

function matchesFilters(
  request: Schema["Request"]["type"],
  input: ListRequestsInput,
): boolean {
  if (input.departmentId && request.departmentId !== input.departmentId) {
    return false;
  }
  if (input.requesterSub && request.requesterSub !== input.requesterSub) {
    return false;
  }
  if (input.requestTypeId && request.requestTypeId !== input.requestTypeId) {
    return false;
  }
  if (input.status && request.status !== input.status) {
    return false;
  }
  return true;
}

async function fetchByDepartmentId(
  departmentId: string,
): Promise<ListQueryResult> {
  const { data, errors, nextToken } =
    await client.models.Request.listRequestByDepartmentIdAndStatus(
      { departmentId },
      { limit: INTERNAL_PAGE_LIMIT },
    );
  if (errors) {
    throw new Error(errors.map((error) => error.message).join(", "));
  }
  return { items: data ?? [], nextToken };
}

async function fetchByRequesterSub(
  requesterSub: string,
): Promise<ListQueryResult> {
  const { data, errors, nextToken } =
    await client.models.Request.listRequestByRequesterSubAndStatus(
      { requesterSub },
      { limit: INTERNAL_PAGE_LIMIT },
    );
  if (errors) {
    throw new Error(errors.map((error) => error.message).join(", "));
  }
  return { items: data ?? [], nextToken };
}

async function fetchByRequestTypeId(
  requestTypeId: string,
): Promise<ListQueryResult> {
  const { data, errors, nextToken } =
    await client.models.Request.listRequestByRequestTypeId(
      { requestTypeId },
      { limit: INTERNAL_PAGE_LIMIT },
    );
  if (errors) {
    throw new Error(errors.map((error) => error.message).join(", "));
  }
  return { items: data ?? [], nextToken };
}

async function fetchNextPageByDepartmentId(
  departmentId: string,
  nextToken: string,
): Promise<ListQueryResult> {
  const { data, errors, nextToken: nextPageToken } =
    await client.models.Request.listRequestByDepartmentIdAndStatus(
      { departmentId },
      { limit: INTERNAL_PAGE_LIMIT, nextToken },
    );
  if (errors) {
    throw new Error(errors.map((error) => error.message).join(", "));
  }
  return { items: data ?? [], nextToken: nextPageToken };
}

async function fetchNextPageByRequesterSub(
  requesterSub: string,
  nextToken: string,
): Promise<ListQueryResult> {
  const { data, errors, nextToken: nextPageToken } =
    await client.models.Request.listRequestByRequesterSubAndStatus(
      { requesterSub },
      { limit: INTERNAL_PAGE_LIMIT, nextToken },
    );
  if (errors) {
    throw new Error(errors.map((error) => error.message).join(", "));
  }
  return { items: data ?? [], nextToken: nextPageToken };
}

async function fetchNextPageByRequestTypeId(
  requestTypeId: string,
  nextToken: string,
): Promise<ListQueryResult> {
  const { data, errors, nextToken: nextPageToken } =
    await client.models.Request.listRequestByRequestTypeId(
      { requestTypeId },
      { limit: INTERNAL_PAGE_LIMIT, nextToken },
    );
  if (errors) {
    throw new Error(errors.map((error) => error.message).join(", "));
  }
  return { items: data ?? [], nextToken: nextPageToken };
}

async function fetchRequestsByPriority(
  input: ListRequestsInput,
): Promise<Schema["Request"]["type"][]> {
  const fetched: Schema["Request"]["type"][] = [];
  let pages = 0;

  if (input.departmentId) {
    let current = await fetchByDepartmentId(input.departmentId);
    while (true) {
      fetched.push(...current.items);
      pages += 1;
      if (!current.nextToken || pages >= MAX_FETCH_PAGES) {
        return fetched;
      }
      current = await fetchNextPageByDepartmentId(
        input.departmentId,
        current.nextToken,
      );
    }
  }

  if (input.requesterSub) {
    let current = await fetchByRequesterSub(input.requesterSub);
    while (true) {
      fetched.push(...current.items);
      pages += 1;
      if (!current.nextToken || pages >= MAX_FETCH_PAGES) {
        return fetched;
      }
      current = await fetchNextPageByRequesterSub(
        input.requesterSub,
        current.nextToken,
      );
    }
  }

  if (input.requestTypeId) {
    let current = await fetchByRequestTypeId(input.requestTypeId);
    while (true) {
      fetched.push(...current.items);
      pages += 1;
      if (!current.nextToken || pages >= MAX_FETCH_PAGES) {
        return fetched;
      }
      current = await fetchNextPageByRequestTypeId(
        input.requestTypeId,
        current.nextToken,
      );
    }
  }

  return fetched;
}

export const handler = async (
  event: ListRequestsInput,
): Promise<ListRequestsOutput> => {
  if (!event.departmentId && !event.requesterSub && !event.requestTypeId) {
    throw new Error(
      "list-requests は departmentId / requesterSub / requestTypeId のいずれかを指定してください。",
    );
  }

  const fetched = await fetchRequestsByPriority(event);
  const items = fetched.filter((request) => matchesFilters(request, event));
  items.sort((left, right) => {
    const leftCreatedAt = left.createdAt ? new Date(left.createdAt).getTime() : 0;
    const rightCreatedAt = right.createdAt
      ? new Date(right.createdAt).getTime()
      : 0;
    return rightCreatedAt - leftCreatedAt;
  });

  return { items };
};
