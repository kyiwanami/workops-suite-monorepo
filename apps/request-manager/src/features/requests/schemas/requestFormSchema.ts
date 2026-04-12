import { z } from "zod";

export const requestFormSchema = z.object({
  requestTypeId: z.string().min(1, "申請種別は必須です"),
  title: z.string().min(1, "タイトルは必須です"),
  description: z.string().nullable().optional(),
  amount: z
    .number({
      invalid_type_error: "金額は数値で入力してください",
    })
    .finite("金額は数値で入力してください")
    .nullable()
    .optional(),
});

export type RequestFormValues = z.input<typeof requestFormSchema>;
export type RequestFormSubmitValues = z.output<typeof requestFormSchema>;
