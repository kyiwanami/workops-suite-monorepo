import { describe, expect, it } from "vitest";
import { buildAssetFormSchema } from "./assetFormSchema";

describe("buildAssetFormSchema", () => {
  it("一般ユーザーなら部署IDなしでも通る", () => {
    const result = buildAssetFormSchema({ isGlobalAdmin: false }).safeParse({
      name: "ノートPC",
      assetTypeId: "asset-type-1",
      status: "inStock",
    });

    expect(result.success).toBe(true);
  });

  it("グローバル管理者なら部署IDが必須になる", () => {
    const result = buildAssetFormSchema({ isGlobalAdmin: true }).safeParse({
      departmentId: "",
      name: "ノートPC",
      assetTypeId: "asset-type-1",
      status: "inStock",
    });

    expect(result.success).toBe(false);
    if (result.success) {
      throw new Error("expected validation error");
    }

    expect(result.error.issues[0]?.message).toBe("部署は必須です");
  });
});
