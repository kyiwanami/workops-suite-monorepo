import { defineStorage } from "@aws-amplify/backend";

// Asset / Request ナレッジベース共通のデータソース用バケット
// パス戦略: kb-docs/asset/* (Asset), kb-docs/request/* (Request)
export const assetStorage = defineStorage({
  name: "asset-kb-source",
  access: (allow) => ({
    "kb-docs/*": [allow.authenticated.to(["read", "write", "delete"])],
  }),
});
