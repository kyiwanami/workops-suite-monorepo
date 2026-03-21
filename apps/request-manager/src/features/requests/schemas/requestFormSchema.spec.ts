import { describe, expect, it } from "vitest";
import { requestFormSchema } from "./requestFormSchema";

describe("requestFormSchema", () => {
  it("正しい申請内容を通す", () => {
    const result = requestFormSchema.safeParse({
      requestTypeId: "request-type-1",
      title: "備品購入",
      description: "ノートPCを購入する",
      amount: 120000,
    });

    expect(result.success).toBe(true);
  });

  it("金額が未入力だと失敗する", () => {
    const result = requestFormSchema.safeParse({
      requestTypeId: "request-type-1",
      title: "備品購入",
    });

    expect(result.success).toBe(false);
    if (result.success) {
      throw new Error("expected validation error");
    }

    expect(result.error.issues[0]?.message).toBe("金額は必須です");
  });
});
