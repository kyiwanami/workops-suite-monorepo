import { z } from "zod";

const documentFormats = [
  "pdf",
  "csv",
  "doc",
  "docx",
  "xls",
  "xlsx",
  "html",
  "txt",
  "md",
  "json",
  "xml",
] as const;

export const documentFormatSchema = z.enum(documentFormats);

export const attachmentSchema = z.object({
  name: z.string().min(1),
  base64: z.string().min(1),
}).superRefine((file, ctx) => {
  const dotIndex = file.name.lastIndexOf(".");
  if (dotIndex < 0) {
    ctx.addIssue({
      code: "custom",
      message: "attachment name must include a supported extension",
    });
    return;
  }

  const ext = file.name.slice(dotIndex + 1).toLowerCase();
  const parsed = documentFormatSchema.safeParse(ext);
  if (!parsed.success) {
    ctx.addIssue({
      code: "custom",
      message: "attachment extension is not supported",
    });
  }
});

export const invocationSchema = z.object({
  query: z.string().min(1),
  sessionId: z.string().min(1),
  attachments: z.array(attachmentSchema).optional(),
});

export const jwtPayloadSchema = z.object({
  sub: z.string().min(1),
});

export type DocumentFormat = z.infer<typeof documentFormatSchema>;
export type Attachment = z.infer<typeof attachmentSchema>;
export type InvocationBody = z.infer<typeof invocationSchema>;

export interface AgentRequest {
  query: string;
  sessionId: string;
  attachments: Attachment[];
  actorId: string;
  authHeader: string;
}

export interface AgentResponse {
  answer: string;
  sessionId: string;
}
