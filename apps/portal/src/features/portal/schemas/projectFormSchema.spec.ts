import { describe, expect, it } from "vitest";
import { buildProjectFormSchema } from "./projectFormSchema";

describe("buildProjectFormSchema", () => {
  it("編集モードなら既存IDでも通す", () => {
    const result = buildProjectFormSchema({
      isEditMode: true,
      existingProjectIds: ["proj-1"],
    }).safeParse({
      projectId: "proj-1",
      name: "共通基盤",
      urlDomain: "https://example.com",
    });

    expect(result.success).toBe(true);
  });

  it("新規作成で既存IDを使うと失敗する", () => {
    const result = buildProjectFormSchema({
      isEditMode: false,
      existingProjectIds: ["proj-1"],
    }).safeParse({
      projectId: "proj-1",
      name: "共通基盤",
      urlDomain: "https://example.com",
    });

    expect(result.success).toBe(false);
    if (result.success) {
      throw new Error("expected validation error");
    }

    expect(result.error.issues[0]?.message).toBe("このプロジェクトIDは既に使用されています");
  });

  it("URL形式が不正なら失敗する", () => {
    const result = buildProjectFormSchema({
      isEditMode: false,
      existingProjectIds: [],
    }).safeParse({
      projectId: "proj-2",
      name: "共通基盤",
      urlDomain: "example",
    });

    expect(result.success).toBe(false);
    if (result.success) {
      throw new Error("expected validation error");
    }

    expect(result.error.issues[0]?.message).toBe(
      "ドメインURLは有効なURL形式で入力してください"
    );
  });
});
