import { describe, expect, it } from "vitest";
import { reasonFormSchema } from "./reasonFormSchema";

describe("reasonFormSchema", () => {
  // 最初の成功例として、正常入力と必須エラーの両方を固定する。
  it("理由があれば検証を通す", () => {
    const result = reasonFormSchema.safeParse({
      reason: "差し戻し理由を記載しました",
    });

    expect(result.success).toBe(true);
  });

  it("理由が空文字なら必須エラーを返す", () => {
    const result = reasonFormSchema.safeParse({
      reason: "",
    });

    expect(result.success).toBe(false);
    if (result.success) {
      throw new Error("expected validation error");
    }

    expect(result.error.issues[0]?.message).toBe("理由を入力してください");
  });
});
