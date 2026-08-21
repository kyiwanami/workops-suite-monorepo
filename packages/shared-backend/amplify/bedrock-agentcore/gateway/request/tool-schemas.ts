import { SchemaDefinitionType, ToolSchema } from "aws-cdk-lib/aws-bedrockagentcore";

export const requestToolNames = {
  searchRequestKb: "search-request-kb",
  getRequest: "get-request",
  listRequests: "list-requests",
  listRequestTypes: "list-request-types",
  createRequest: "create-request",
  updateRequest: "update-request",
  submitRequest: "submit-request",
  withdrawRequest: "withdraw-request",
  approveRequest: "approve-request",
  rejectRequest: "reject-request",
  returnRequest: "return-request",
} as const;

export const searchRequestKnowledgeBaseToolSchema = ToolSchema.fromInline([{
  name: requestToolNames.searchRequestKb,
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
}]);
export const getRequestToolSchema = ToolSchema.fromInline([{
  name: requestToolNames.getRequest,
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
}]);

export const listRequestsToolSchema = ToolSchema.fromInline([{
  name: requestToolNames.listRequests,
  description:
    "departmentId・requesterSub・requestTypeIdのいずれかを必ず指定して申請を絞り込みます。status単独と空引数は使用できません。複数指定時はすべての条件に一致する申請だけを返します。曖昧検索は search-request-kb を使用してください。",
  inputSchema: {
    type: SchemaDefinitionType.OBJECT,
    properties: {
      departmentId: {
        type: SchemaDefinitionType.STRING,
        description: "部署コードで絞り込み。この項目を検索selectorにできます",
      },
      requesterSub: {
        type: SchemaDefinitionType.STRING,
        description:
          "申請者のCognito subで絞り込み。この項目を検索selectorにできます",
      },
      status: {
        type: SchemaDefinitionType.STRING,
        description:
          "draft|submitted|approved|rejected|withdrawn。検索selectorとは併用必須です",
      },
      requestTypeId: {
        type: SchemaDefinitionType.STRING,
        description: "申請種別IDで絞り込み。この項目を検索selectorにできます",
      },
    },
    // Gateway schemaはanyOfを持たないため、OR必須条件はdescriptionとLambdaで検証する。
    required: [],
  },
}]);

export const listRequestTypesToolSchema = ToolSchema.fromInline([{
  name: requestToolNames.listRequestTypes,
  description:
    "有効な申請種別マスタを取得します。作成・更新前の候補提示に使用します。",
  inputSchema: {
    type: SchemaDefinitionType.OBJECT,
    properties: {},
    required: [],
  },
}]);

export const createRequestToolSchema = ToolSchema.fromInline([{
  name: requestToolNames.createRequest,
  description:
    "新しい申請をdraftで登録します。提出は submit-request を使用してください。",
  inputSchema: {
    type: SchemaDefinitionType.OBJECT,
    properties: {
      departmentId: {
        type: SchemaDefinitionType.STRING,
        description:
          "本人委任解除後にGateway境界で検証する申請者の部門コード",
      },
      requesterSub: {
        type: SchemaDefinitionType.STRING,
        description:
          "本人委任解除後にGateway境界で検証する申請者のCognito sub",
      },
      requestTypeId: {
        type: SchemaDefinitionType.STRING,
        description: "申請種別ID（必須）",
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
    },
    required: ["requestTypeId", "title"],
  },
}]);

export const updateRequestToolSchema = ToolSchema.fromInline([{
  name: requestToolNames.updateRequest,
  description:
    "申請の通常更新を実行します。patch 内で更新項目を指定してください。",
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
        required: [],
      },
    },
    required: ["id", "patch"],
  },
}]);

export const submitRequestToolSchema = ToolSchema.fromInline([{
  name: requestToolNames.submitRequest,
  description: "申請を提出します（draft からのみ遷移可能）。",
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
}]);

export const withdrawRequestToolSchema = ToolSchema.fromInline([{
  name: requestToolNames.withdrawRequest,
  description:
    "申請を取り下げます（draft または submitted からのみ遷移可能）。",
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
}]);

export const approveRequestToolSchema = ToolSchema.fromInline([{
  name: requestToolNames.approveRequest,
  description: "申請を承認します（submitted からのみ遷移可能）。",
  inputSchema: {
    type: SchemaDefinitionType.OBJECT,
    properties: {
      id: {
        type: SchemaDefinitionType.STRING,
        description: "対象申請ID（必須）",
      },
      approverSub: {
        type: SchemaDefinitionType.STRING,
        description:
          "本人委任解除後にGateway境界で検証する承認者のCognito sub（任意）",
      },
    },
    required: ["id"],
  },
}]);

export const rejectRequestToolSchema = ToolSchema.fromInline([{
  name: requestToolNames.rejectRequest,
  description:
    "申請を却下します。reason を必ず指定してください（submitted からのみ遷移可能）。",
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
}]);

export const returnRequestToolSchema = ToolSchema.fromInline([{
  name: requestToolNames.returnRequest,
  description:
    "申請を差戻しします。reason を必ず指定してください。差戻し後は draft に戻ります。",
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
}]);
