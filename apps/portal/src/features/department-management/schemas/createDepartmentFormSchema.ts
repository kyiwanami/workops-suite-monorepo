import { z } from "zod";

export const createDepartmentFormSchema = z.object({
  code: z
    .string()
    .min(1, "部署コードは必須です")
    .regex(/^[A-Z0-9_]+$/, "英大文字・数字・アンダースコアのみ使用できます"),
  name: z.string().min(1, "部署名は必須です"),
  sortOrder: z
    .number()
    .int("表示順は0以上の数値で入力してください")
    .min(0, "表示順は0以上の数値で入力してください")
    .optional(),
  notes: z.string(),
});

export type CreateDepartmentFormValues = z.infer<typeof createDepartmentFormSchema>;
