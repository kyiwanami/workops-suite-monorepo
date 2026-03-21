import { describe, expect, it } from "vitest";
import { createUserFormSchema } from "./createUserFormSchema";

describe("createUserFormSchema", () => {
  it("正しいユーザー情報を通す", () => {
    const result = createUserFormSchema.safeParse({
      username: "tanaka",
      email: "tanaka@example.com",
    });

    expect(result.success).toBe(true);
  });

  it("メールアドレスが不正だと失敗する", () => {
    const result = createUserFormSchema.safeParse({
      username: "tanaka",
      email: "invalid-email",
    });

    expect(result.success).toBe(false);
    if (result.success) {
      throw new Error("expected validation error");
    }

    expect(result.error.issues[0]?.message).toBe("有効なメールアドレスを入力してください");
  });
});
