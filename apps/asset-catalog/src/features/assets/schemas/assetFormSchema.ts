import { z } from "zod";

type BuildAssetFormSchemaParams = {
  isGlobalAdmin: boolean;
};

export const buildAssetFormSchema = ({ isGlobalAdmin }: BuildAssetFormSchemaParams) =>
  z.object({
    departmentId: isGlobalAdmin
      ? z.string().min(1, "部署は必須です")
      : z.string().optional(),
    name: z.string().min(1, "名称は必須です"),
    assetTypeId: z.string().min(1, "資産種別は必須です"),
    status: z.enum(["inStock", "lent", "inRepair", "disposed"]),
    assigneeSub: z.string().nullable().optional(),
  });

export type AssetFormValues = z.infer<ReturnType<typeof buildAssetFormSchema>>;
