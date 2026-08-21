import { SchemaDefinitionType, ToolSchema } from "aws-cdk-lib/aws-bedrockagentcore";

export const assetToolNames = {
  searchAssetKb: "search-asset-kb",
  listAssets: "list-assets",
  getAsset: "get-asset",
  listAssetTypes: "list-asset-types",
  createAsset: "create-asset",
  updateAsset: "update-asset",
  deleteAsset: "delete-asset",
  createAssetType: "create-asset-type",
} as const;

export const searchAssetKnowledgeBaseToolSchema = ToolSchema.fromInline([{
  name: assetToolNames.searchAssetKb,
  description:
    "資産を自然言語・セマンティック検索します。list-assets の許可組み合わせに当てはまらない条件（例: statusのみ、departmentId+assetTypeId など）はこちらを使用します。",
  inputSchema: {
    type: SchemaDefinitionType.OBJECT,
    properties: {
      query: {
        type: SchemaDefinitionType.STRING,
        description: "検索キーワードや質問内容",
      },
    },
    required: ["query"],
  },
}]);
export const listAssetsToolSchema = ToolSchema.fromInline([{
  name: assetToolNames.listAssets,
  description:
    "GSIで資産を取得します。利用可能な組み合わせは `departmentId` 単独/`departmentId+status`、`assigneeSub` 単独/`assigneeSub+status`、`assetTypeId` 単独のみです。これ以外の条件は呼び出さず search-asset-kb を使用してください。",
  inputSchema: {
    type: SchemaDefinitionType.OBJECT,
    properties: {
      departmentId: {
        type: SchemaDefinitionType.STRING,
        description: "部署コード（GSIキー）。status との組み合わせのみ許可",
      },
      status: {
        type: SchemaDefinitionType.STRING,
        description:
          "inStock|lent|inRepair|disposed。departmentId または assigneeSub と併用時のみ使用",
      },
      assetTypeId: {
        type: SchemaDefinitionType.STRING,
        description: "資産種別ID（GSIキー）。単独指定のみ許可",
      },
      assigneeSub: {
        type: SchemaDefinitionType.STRING,
        description: "担当者のCognito sub（GSIキー）。status との組み合わせのみ許可",
      },
      limit: {
        type: SchemaDefinitionType.NUMBER,
        description: "取得件数上限（省略可）",
      },
      nextToken: {
        type: SchemaDefinitionType.STRING,
        description: "ページングトークン（省略可）",
      },
    },
    required: [],
  },
}]);

export const getAssetToolSchema = ToolSchema.fromInline([{
  name: assetToolNames.getAsset,
  description: "資産IDで1件の資産詳細を取得します。IDが確定している場合に使用します。",
  inputSchema: {
    type: SchemaDefinitionType.OBJECT,
    properties: {
      id: {
        type: SchemaDefinitionType.STRING,
        description: "取得対象の資産ID（必須）",
      },
    },
    required: ["id"],
  },
}]);

export const listAssetTypesToolSchema = ToolSchema.fromInline([{
  name: assetToolNames.listAssetTypes,
  description:
    "登録済みの資産種別マスタ一覧を取得します。資産登録・更新前に種別IDを確認する際に使用します。",
  inputSchema: {
    type: SchemaDefinitionType.OBJECT,
    properties: {
      limit: {
        type: SchemaDefinitionType.NUMBER,
        description: "取得件数上限（省略可）",
      },
      nextToken: {
        type: SchemaDefinitionType.STRING,
        description: "ページングトークン（省略可）",
      },
    },
    required: [],
  },
}]);

export const createAssetToolSchema = ToolSchema.fromInline([{
  name: assetToolNames.createAsset,
  description:
    "新しい資産を登録します。資産の追加・登録を依頼された際に使用します。",
  inputSchema: {
    type: SchemaDefinitionType.OBJECT,
    properties: {
      departmentId: {
        type: SchemaDefinitionType.STRING,
        description: "資産が所属する部門コード（必須）",
      },
      name: {
        type: SchemaDefinitionType.STRING,
        description: "資産名称（必須）",
      },
      assetTypeId: {
        type: SchemaDefinitionType.STRING,
        description: "資産タイプID（必須）",
      },
      status: {
        type: SchemaDefinitionType.STRING,
        description:
          "資産ステータス（必須）: inStock(在庫), lent(貸出中), inRepair(修理中), disposed(廃棄)",
      },
      assigneeSub: {
        type: SchemaDefinitionType.STRING,
        description: "担当者の Cognito sub（省略可能）",
      },
    },
    required: ["departmentId", "name", "assetTypeId", "status"],
  },
}]);

export const updateAssetToolSchema = ToolSchema.fromInline([{
  name: assetToolNames.updateAsset,
  description: "既存の資産を更新します。状態変更・担当者変更などに使用します。",
  inputSchema: {
    type: SchemaDefinitionType.OBJECT,
    properties: {
      id: {
        type: SchemaDefinitionType.STRING,
        description: "更新対象の資産ID（必須）",
      },
      assetTypeId: {
        type: SchemaDefinitionType.STRING,
        description: "新しい資産種別ID",
      },
      departmentId: {
        type: SchemaDefinitionType.STRING,
        description: "新しい部署コード",
      },
      name: {
        type: SchemaDefinitionType.STRING,
        description: "新しい資産名称",
      },
      status: {
        type: SchemaDefinitionType.STRING,
        description: "inStock|lent|inRepair|disposed",
      },
      assigneeSub: {
        type: SchemaDefinitionType.STRING,
        description: "新しい担当者のCognito sub",
      },
    },
    required: ["id"],
  },
}]);

export const deleteAssetToolSchema = ToolSchema.fromInline([{
  name: assetToolNames.deleteAsset,
  description:
    "資産を物理削除します（復元不可）。ユーザーが削除を確認した後に使用します。",
  inputSchema: {
    type: SchemaDefinitionType.OBJECT,
    properties: {
      id: {
        type: SchemaDefinitionType.STRING,
        description: "削除対象の資産ID（必須）",
      },
    },
    required: ["id"],
  },
}]);

export const createAssetTypeToolSchema = ToolSchema.fromInline([{
  name: assetToolNames.createAssetType,
  description:
    "新しい資産種別マスタを登録します。管理者が新たな種別（例：プリンタ）を追加する際に使用します。",
  inputSchema: {
    type: SchemaDefinitionType.OBJECT,
    properties: {
      code: {
        type: SchemaDefinitionType.STRING,
        description: "種別コード（必須・一意）",
      },
      name: {
        type: SchemaDefinitionType.STRING,
        description: "種別名（必須）",
      },
      description: {
        type: SchemaDefinitionType.STRING,
        description: "説明（省略可）",
      },
      sortOrder: {
        type: SchemaDefinitionType.NUMBER,
        description: "表示順（省略可）",
      },
    },
    required: ["code", "name"],
  },
}]);
