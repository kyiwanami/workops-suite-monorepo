import { z } from "zod";

export const assetTypeFormSchema = z.object({
  code: z.string().min(1, "コードは必須です"),
  name: z.string().min(1, "名称は必須です"),
  description: z.string().nullable().optional(),
  sortOrder: z
    .number()
    .int("表示順は数値で入力してください")
    .nullable()
    .optional(),
});

export type AssetTypeFormValues = z.infer<typeof assetTypeFormSchema>;
