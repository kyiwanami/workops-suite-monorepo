import { z } from "zod";

type BuildAppFormSchemaParams = {
  isEditMode: boolean;
  existingAppIds: string[];
};

const requiredText = (message: string) => z.string().min(1, message);

export const buildAppFormSchema = ({
  isEditMode,
  existingAppIds,
}: BuildAppFormSchemaParams) =>
  z
    .object({
      appId: requiredText("プロジェクトIDは必須です"),
      name: requiredText("プロジェクト名は必須です"),
      description: z.string().nullable().optional(),
      urlDomain: requiredText("ドメインURLは必須です").refine(
        (value) => URL.canParse(value),
        "ドメインURLは有効なURL形式で入力してください"
      ),
      iconName: z.string().nullable().optional(),
      color: z.string().nullable().optional(),
    })
    .superRefine((values, context) => {
      if (!isEditMode && existingAppIds.includes(values.appId)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "このプロジェクトIDは既に使用されています",
          path: ["appId"],
        });
      }
    });

export type AppFormValues = z.infer<ReturnType<typeof buildAppFormSchema>>;
