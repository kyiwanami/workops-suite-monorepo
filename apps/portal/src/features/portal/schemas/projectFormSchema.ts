import { z } from "zod";

type BuildProjectFormSchemaParams = {
  isEditMode: boolean;
  existingProjectIds: string[];
};

const requiredText = (message: string) => z.string().min(1, message);

export const buildProjectFormSchema = ({
  isEditMode,
  existingProjectIds,
}: BuildProjectFormSchemaParams) =>
  z
    .object({
      projectId: requiredText("プロジェクトIDは必須です"),
      name: requiredText("プロジェクト名は必須です"),
      description: z.string().nullable().optional(),
      urlDomain: requiredText("ドメインURLは必須です"),
      iconName: z.string().nullable().optional(),
      color: z.string().nullable().optional(),
    })
    .superRefine((values, context) => {
      if (!isEditMode && existingProjectIds.includes(values.projectId)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "このプロジェクトIDは既に使用されています",
          path: ["projectId"],
        });
      }
    });

export type ProjectFormValues = z.infer<ReturnType<typeof buildProjectFormSchema>>;