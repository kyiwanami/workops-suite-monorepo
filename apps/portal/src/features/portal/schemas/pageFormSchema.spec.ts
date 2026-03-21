import { describe, expect, it } from "vitest";
import { buildPageFormSchema } from "./pageFormSchema";

describe("buildPageFormSchema", () => {
  it("編集モードなら既存IDでも通す", () => {
    const result = buildPageFormSchema({
      isEditMode: true,
      existingPageIds: ["page-1"],
    }).safeParse({
      pageId: "page-1",
      name: "ホーム",
    });

    expect(result.success).toBe(true);
  });

  it("新規作成で既存IDを使うと失敗する", () => {
    const result = buildPageFormSchema({
      isEditMode: false,
      existingPageIds: ["page-1"],
    }).safeParse({
      pageId: "page-1",
      name: "ホーム",
    });

    expect(result.success).toBe(false);
    if (result.success) {
      throw new Error("expected validation error");
    }

    expect(result.error.issues[0]?.message).toBe("このページIDは既に使用されています");
  });
});
