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

  it("金額が未入力でも通す", () => {
    const result = requestFormSchema.safeParse({
      requestTypeId: "request-type-1",
      title: "備品購入",
      amount: null,
    });

    expect(result.success).toBe(true);
  });
});
