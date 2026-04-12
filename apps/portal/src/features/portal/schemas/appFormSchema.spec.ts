import { describe, expect, it } from "vitest";
import { buildAppFormSchema } from "./appFormSchema";

describe("buildAppFormSchema", () => {
  it("編集モードなら既存IDでも通す", () => {
    const result = buildAppFormSchema({
      isEditMode: true,
      existingAppIds: ["proj-1"],
    }).safeParse({
      appId: "proj-1",
      name: "共通基盤",
      urlDomain: "https://example.com",
    });

    expect(result.success).toBe(true);
  });

  it("新規作成で既存IDを使うと失敗する", () => {
    const result = buildAppFormSchema({
      isEditMode: false,
      existingAppIds: ["proj-1"],
    }).safeParse({
      appId: "proj-1",
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
    const result = buildAppFormSchema({
      isEditMode: false,
      existingAppIds: [],
    }).safeParse({
      appId: "proj-2",
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
