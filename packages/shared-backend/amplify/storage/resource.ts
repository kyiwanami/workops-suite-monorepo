import { defineStorage } from "@aws-amplify/backend";

// ナレッジベースのデータソース（ドキュメント置き場）用バケット
export const storage = defineStorage({
  name: "kb-source",
  access: (allow) => ({
    "kb-docs/*": [allow.authenticated.to(["read", "write", "delete"])],
  }),
});
