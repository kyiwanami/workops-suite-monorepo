import { z } from "zod";

export const reasonFormSchema = z.object({
  reason: z.string().min(1, "理由を入力してください"),
});

export type ReasonFormValues = z.infer<typeof reasonFormSchema>;