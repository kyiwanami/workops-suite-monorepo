import { Amplify } from "aws-amplify";
import { generateClient } from "aws-amplify/data";
import { getAmplifyDataClientConfig } from "@aws-amplify/backend/function/runtime";
import { env } from "$amplify/env/asset-tool-list";
import type { Schema } from "../../../data/resource";

const { resourceConfig, libraryOptions } = await getAmplifyDataClientConfig(env);
Amplify.configure(resourceConfig, libraryOptions);

const client = generateClient<Schema>();

interface ListAssetsInput {
  departmentId?: string;
  status?: AssetStatusCode;
  assetTypeId?: string;
  assigneeSub?: string;
  limit?: number;
  nextToken?: string;
}

type AssetStatusCode = Schema["Asset"]["type"]["status"];

function buildCombinationKey(input: ListAssetsInput): string {
  const keys: string[] = [];
  if (input.departmentId) {
    keys.push("departmentId");
  }
  if (input.assigneeSub) {
    keys.push("assigneeSub");
  }
  if (input.assetTypeId) {
    keys.push("assetTypeId");
  }
  if (input.status) {
    keys.push("status");
  }
  return keys.join("+");
}

function assertDefined<T>(value: T, message: string): asserts value is NonNullable<T> {
  if (!value) {
    throw new Error(message);
  }
}

export const handler = async (event: ListAssetsInput) => {
  console.log("List Assets Event:", JSON.stringify(event));

  const pagination = {
    limit: event.limit,
    nextToken: event.nextToken ?? undefined,
  };

  const combinationKey = buildCombinationKey(event);

  switch (combinationKey) {
    case "departmentId":
    case "departmentId+status": {
      const departmentId = event.departmentId;
      assertDefined(
        departmentId,
        "list-assets は departmentId[/status]・assigneeSub[/status]・assetTypeId の組み合わせのみ許可されています。",
      );
      const status = event.status;
      const key = status ? { departmentId, status: { eq: status } } : { departmentId };
      const { data, errors } = await client.models.Asset.listAssetByDepartmentIdAndStatus(
        key,
        pagination,
      );
      if (errors) {
        throw new Error(errors.map((error) => error.message).join(", "));
      }
      return { data: data ?? [] };
    }
    case "assigneeSub":
    case "assigneeSub+status": {
      const assigneeSub = event.assigneeSub;
      assertDefined(
        assigneeSub,
        "list-assets は departmentId[/status]・assigneeSub[/status]・assetTypeId の組み合わせのみ許可されています。",
      );
      const status = event.status;
      const key = status ? { assigneeSub, status: { eq: status } } : { assigneeSub };
      const { data, errors } = await client.models.Asset.listAssetByAssigneeSubAndStatus(
        key,
        pagination,
      );
      if (errors) {
        throw new Error(errors.map((error) => error.message).join(", "));
      }
      return { data: data ?? [] };
    }
    case "assetTypeId": {
      const assetTypeId = event.assetTypeId;
      assertDefined(
        assetTypeId,
        "list-assets は departmentId[/status]・assigneeSub[/status]・assetTypeId の組み合わせのみ許可されています。",
      );
      const { data, errors } = await client.models.Asset.listAssetByAssetTypeId(
        { assetTypeId },
        pagination,
      );
      if (errors) {
        throw new Error(errors.map((error) => error.message).join(", "));
      }
      return { data: data ?? [] };
    }
    default:
      throw new Error(
        "list-assets は departmentId[/status]・assigneeSub[/status]・assetTypeId の組み合わせのみ許可されています。",
      );
  }
};
