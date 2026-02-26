import { z } from "zod";

type BuildPageFormSchemaParams = {
  isEditMode: boolean;
  existingPageIds: string[];
};

const requiredText = (message: string) => z.string().min(1, message);

export const buildPageFormSchema = ({
  isEditMode,
  existingPageIds,
}: BuildPageFormSchemaParams) =>
  z
    .object({
      pageId: requiredText("ページIDは必須です"),
      name: requiredText("ページ名は必須です"),
      description: z.string().nullable().optional(),
      relativePath: z.string().nullable().optional(),
      iconName: z.string().nullable().optional(),
    })
    .superRefine((values, context) => {
      if (!isEditMode && existingPageIds.includes(values.pageId)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "このページIDは既に使用されています",
          path: ["pageId"],
        });
      }
    });

export type PageFormValues = z.infer<ReturnType<typeof buildPageFormSchema>>;