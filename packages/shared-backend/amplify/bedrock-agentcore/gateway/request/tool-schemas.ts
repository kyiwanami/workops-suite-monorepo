import {
  SchemaDefinitionType,
  ToolSchema,
} from "@aws-cdk/aws-bedrock-agentcore-alpha";

export const searchRequestKnowledgeBaseToolSchema = ToolSchema.fromInline([
  {
    name: "search-request-knowledge-base",
    description:
      "申請ナレッジベースを検索します。申請の状態・種別・金額など詳細情報を調べる際に使用します。",
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
  },
]);

export const createRequestToolSchema = ToolSchema.fromInline([
  {
    name: "create-request",
    description:
      "新しい申請を登録します。status 未指定時は draft で作成されます。提出は submit-request を使用してください。",
    inputSchema: {
      type: SchemaDefinitionType.OBJECT,
      properties: {
        departmentId: {
          type: SchemaDefinitionType.STRING,
          description: "申請者が所属する部門コード（必須）",
        },
        requesterSub: {
          type: SchemaDefinitionType.STRING,
          description: "申請者の Cognito sub（必須）",
        },
        requestTypeId: {
          type: SchemaDefinitionType.STRING,
          description: "申請種別ID（必須）",
        },
        status: {
          type: SchemaDefinitionType.STRING,
          description:
            "申請ステータス（任意）: draft, submitted, approved, rejected, withdrawn。省略時は draft。",
        },
        title: {
          type: SchemaDefinitionType.STRING,
          description: "申請タイトル（必須）",
        },
        amount: {
          type: SchemaDefinitionType.INTEGER,
          description: "申請金額（任意）",
        },
        description: {
          type: SchemaDefinitionType.STRING,
          description: "申請詳細（任意）",
        },
        submittedAt: {
          type: SchemaDefinitionType.STRING,
          description: "申請提出日時（ISO 8601, 任意）",
        },
        approvedAt: {
          type: SchemaDefinitionType.STRING,
          description: "承認日時（ISO 8601, 任意）",
        },
        rejectedAt: {
          type: SchemaDefinitionType.STRING,
          description: "却下日時（ISO 8601, 任意）",
        },
        withdrawnAt: {
          type: SchemaDefinitionType.STRING,
          description: "取り下げ日時（ISO 8601, 任意）",
        },
        returnedAt: {
          type: SchemaDefinitionType.STRING,
          description: "差し戻し日時（ISO 8601, 任意）",
        },
      },
      required: [
        "departmentId",
        "requesterSub",
        "requestTypeId",
        "title",
      ],
    },
  },
]);

export const getRequestToolSchema = ToolSchema.fromInline([
  {
    name: "get-request",
    description: "申請IDで1件の申請詳細を取得します。",
    inputSchema: {
      type: SchemaDefinitionType.OBJECT,
      properties: {
        id: {
          type: SchemaDefinitionType.STRING,
          description: "取得対象の申請ID（必須）",
        },
      },
      required: ["id"],
    },
  },
]);

export const listRequestsToolSchema = ToolSchema.fromInline([
  {
    name: "list-requests",
    description:
      "部署・申請者・状態・申請種別の条件で申請を絞り込みます。条件が明確な場合はこのGSI検索を使用し、曖昧検索は search-request-knowledge-base を使用してください。",
    inputSchema: {
      type: SchemaDefinitionType.OBJECT,
      properties: {
        departmentId: {
          type: SchemaDefinitionType.STRING,
          description: "部署コードで絞り込み（省略可）",
        },
        requesterSub: {
          type: SchemaDefinitionType.STRING,
          description: "申請者のCognito subで絞り込み（省略可）",
        },
        status: {
          type: SchemaDefinitionType.STRING,
          description:
            "draft|submitted|approved|rejected|withdrawn（省略可）",
        },
        requestTypeId: {
          type: SchemaDefinitionType.STRING,
          description: "申請種別IDで絞り込み（省略可）",
        },
      },
      required: [],
    },
  },
]);

export const updateRequestToolSchema = ToolSchema.fromInline([
  {
    name: "update-request",
    description:
      "申請の通常更新を実行します。action=update を指定し、patch 内で更新項目を指定してください。",
    inputSchema: {
      type: SchemaDefinitionType.OBJECT,
      properties: {
        id: {
          type: SchemaDefinitionType.STRING,
          description: "更新対象の申請ID（必須）",
        },
        patch: {
          type: SchemaDefinitionType.OBJECT,
          description: "更新項目（1つ以上必須）",
          properties: {
            requestTypeId: {
              type: SchemaDefinitionType.STRING,
              description: "申請種別ID",
            },
            title: {
              type: SchemaDefinitionType.STRING,
              description: "申請タイトル",
            },
            description: {
              type: SchemaDefinitionType.STRING,
              description: "申請詳細",
            },
            amount: {
              type: SchemaDefinitionType.INTEGER,
              description: "申請金額",
            },
          },
        },
      },
      required: ["id", "patch"],
    },
  },
]);

export const submitRequestToolSchema = ToolSchema.fromInline([
  {
    name: "submit-request",
    description:
      "申請を提出します。action=submit を指定してください（draft からのみ遷移可能）。",
    inputSchema: {
      type: SchemaDefinitionType.OBJECT,
      properties: {
        id: {
          type: SchemaDefinitionType.STRING,
          description: "対象申請ID（必須）",
        },
      },
      required: ["id"],
    },
  },
]);

export const withdrawRequestToolSchema = ToolSchema.fromInline([
  {
    name: "withdraw-request",
    description:
      "申請を取り下げます。action=withdraw を指定してください（draft または submitted からのみ遷移可能）。",
    inputSchema: {
      type: SchemaDefinitionType.OBJECT,
      properties: {
        id: {
          type: SchemaDefinitionType.STRING,
          description: "対象申請ID（必須）",
        },
      },
      required: ["id"],
    },
  },
]);

export const approveRequestToolSchema = ToolSchema.fromInline([
  {
    name: "approve-request",
    description:
      "申請を承認します。action=approve を指定してください（submitted からのみ遷移可能）。",
    inputSchema: {
      type: SchemaDefinitionType.OBJECT,
      properties: {
        id: {
          type: SchemaDefinitionType.STRING,
          description: "対象申請ID（必須）",
        },
        approverSub: {
          type: SchemaDefinitionType.STRING,
          description: "承認者の Cognito sub（任意。実行時に自動補完されます）",
        },
      },
      required: ["id"],
    },
  },
]);

export const rejectRequestToolSchema = ToolSchema.fromInline([
  {
    name: "reject-request",
    description:
      "申請を却下します。action=reject を指定し、reason を必ず指定してください（submitted からのみ遷移可能）。",
    inputSchema: {
      type: SchemaDefinitionType.OBJECT,
      properties: {
        id: {
          type: SchemaDefinitionType.STRING,
          description: "対象申請ID（必須）",
        },
        reason: {
          type: SchemaDefinitionType.STRING,
          description: "却下理由（必須）",
        },
      },
      required: ["id", "reason"],
    },
  },
]);

export const returnRequestToolSchema = ToolSchema.fromInline([
  {
    name: "return-request",
    description:
      "申請を差戻しします。action=return を指定し、reason を必ず指定してください。差戻し後は draft に戻ります。",
    inputSchema: {
      type: SchemaDefinitionType.OBJECT,
      properties: {
        id: {
          type: SchemaDefinitionType.STRING,
          description: "対象申請ID（必須）",
        },
        reason: {
          type: SchemaDefinitionType.STRING,
          description: "差戻し理由（必須）",
        },
      },
      required: ["id", "reason"],
    },
  },
]);

export const listRequestTypesToolSchema = ToolSchema.fromInline([
  {
    name: "list-request-types",
    description:
      "有効な申請種別マスタを取得します。作成・更新前の候補提示に使用します。",
    inputSchema: {
      type: SchemaDefinitionType.OBJECT,
      properties: {},
      required: [],
    },
  },
]);
