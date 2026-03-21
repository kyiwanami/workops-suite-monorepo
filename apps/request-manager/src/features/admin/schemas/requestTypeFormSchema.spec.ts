import { describe, expect, it } from "vitest";
import { requestTypeFormSchema } from "./requestTypeFormSchema";

describe("requestTypeFormSchema", () => {
  it("正しい申請種別を通す", () => {
    const result = requestTypeFormSchema.safeParse({
      code: "PURCHASE",
      name: "購入申請",
      description: "備品購入",
      sortOrder: 10,
    });

    expect(result.success).toBe(true);
  });

  it("表示順が整数でなければ失敗する", () => {
    const result = requestTypeFormSchema.safeParse({
      code: "PURCHASE",
      name: "購入申請",
      sortOrder: 1.2,
    });

    expect(result.success).toBe(false);
    if (result.success) {
      throw new Error("expected validation error");
    }

    expect(result.error.issues[0]?.message).toBe("表示順は数値で入力してください");
  });
});
