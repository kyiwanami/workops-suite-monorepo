import { z } from "zod";

export const createUserFormSchema = z.object({
  username: z.string().min(1, "ユーザー名は必須です"),
  email: z
    .string()
    .min(1, "メールアドレスは必須です")
    .email("有効なメールアドレスを入力してください"),
});

export type CreateUserFormValues = z.infer<typeof createUserFormSchema>;