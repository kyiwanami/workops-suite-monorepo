import { describe, expect, it } from "vitest";
import { createDepartmentFormSchema } from "./createDepartmentFormSchema";

describe("createDepartmentFormSchema", () => {
  it("正しい部署情報を通す", () => {
    const result = createDepartmentFormSchema.safeParse({
      code: "SALES_1",
      name: "営業",
      sortOrder: 1,
      notes: "営業部門",
    });

    expect(result.success).toBe(true);
  });

  it("部署コードに小文字が含まれると失敗する", () => {
    const result = createDepartmentFormSchema.safeParse({
      code: "sales_1",
      name: "営業",
      sortOrder: 1,
      notes: "営業部門",
    });

    expect(result.success).toBe(false);
    if (result.success) {
      throw new Error("expected validation error");
    }

    expect(result.error.issues[0]?.message).toBe("英大文字・数字・アンダースコアのみ使用できます");
  });

  it("表示順が未入力だと失敗する", () => {
    const result = createDepartmentFormSchema.safeParse({
      code: "SALES_1",
      name: "営業",
      notes: "営業部門",
    });

    expect(result.success).toBe(false);
  });
});
