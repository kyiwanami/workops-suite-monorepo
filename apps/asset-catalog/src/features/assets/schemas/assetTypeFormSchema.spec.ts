import { describe, expect, it } from "vitest";
import { assetTypeFormSchema } from "./assetTypeFormSchema";

describe("assetTypeFormSchema", () => {
  it("正常な資産種別を通す", () => {
    const result = assetTypeFormSchema.safeParse({
      code: "LAPTOP",
      name: "ノートPC",
      description: "貸与対象",
      sortOrder: 10,
    });

    expect(result.success).toBe(true);
  });

  it("表示順が整数でなければ失敗する", () => {
    const result = assetTypeFormSchema.safeParse({
      code: "LAPTOP",
      name: "ノートPC",
      sortOrder: 1.5,
    });

    expect(result.success).toBe(false);
    if (result.success) {
      throw new Error("expected validation error");
    }

    expect(result.error.issues[0]?.message).toBe("表示順は数値で入力してください");
  });
});
