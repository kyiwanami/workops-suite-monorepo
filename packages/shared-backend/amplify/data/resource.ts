import { type ClientSchema, a, defineData } from "@aws-amplify/backend";

import { listUsersFunction } from "../function/user-operations/list-users/resource";
import { getUserFunction } from "../function/user-operations/get-user/resource";
import { createUserFunction } from "../function/user-operations/create-user/resource";
import { setUserEnabledFunction } from "../function/user-operations/set-user-enabled/resource";
import { deleteUserFunction } from "../function/user-operations/delete-user/resource";
import { listGroupsFunction } from "../function/group-operations/list-groups/resource";
import { createGroupFunction } from "../function/group-operations/create-group/resource";
import { deleteGroupFunction } from "../function/group-operations/delete-group/resource";
import { addUserToGroupFunction } from "../function/group-operations/add-user-to-group/resource";
import { removeUserFromGroupFunction } from "../function/group-operations/remove-user-from-group/resource";
import { listGroupsForUserFunction } from "../function/group-operations/list-groups-for-user/resource";
import { listUsersInGroupFunction } from "../function/group-operations/list-users-in-group/resource";
import { preTokenGenerationFunction } from "../function/pre-token-generation/resource";
import { assetToolCreate } from "../function/tools/asset-tool-create/resource";
import { assetToolDelete } from "../function/tools/asset-tool-delete/resource";
import { assetToolGet } from "../function/tools/asset-tool-get/resource";
import { assetToolList } from "../function/tools/asset-tool-list/resource";
import { assetToolUpdate } from "../function/tools/asset-tool-update/resource";
import { assetTypeToolCreate } from "../function/tools/asset-type-tool-create/resource";
import { assetTypeToolList } from "../function/tools/asset-type-tool-list/resource";
import { requestToolCreate } from "../function/tools/request-tool-create/resource";
import { requestToolGet } from "../function/tools/request-tool-get/resource";
import { requestToolList } from "../function/tools/request-tool-list/resource";
import { requestToolUpdate } from "../function/tools/request-tool-update/resource";
import { requestTypeToolList } from "../function/tools/request-type-tool-list/resource";

const schema = a
  .schema({

    // =============================================
    // 共通列挙型
    // =============================================

    // 権限
    Role: a.enum(["viewer", "editor", "manager"]),

    // チャットロール
    ChatRole: a.enum(["user", "assistant"]),

    // チャット履歴の並び順
    SortDirection: a.enum(["ASC", "DESC"]),

    // =============================================
    // User Management Types
    // =============================================
    CognitoUser: a.customType({
      username: a.string().required(),
      email: a.string(),
      status: a.string(),
      enabled: a.boolean(),
      createdDate: a.datetime(),
      lastModifiedDate: a.datetime(),
    }),
    UserDetail: a.customType({
      username: a.string().required(),
      status: a.string(),
      enabled: a.boolean(),
      createdDate: a.datetime(),
      lastModifiedDate: a.datetime(),
      attributes: a.json(),
    }),

    // User Management Operations
    listUsers: a
      .query()
      .returns(a.ref("CognitoUser").array())
      .handler(a.handler.function(listUsersFunction)),

    getUser: a
      .query()
      .arguments({
        username: a.string().required(),
      })
      .returns(a.ref("UserDetail"))
      .handler(a.handler.function(getUserFunction)),

    createUser: a
      .mutation()
      .arguments({
        username: a.string().required(),
        email: a.string().required(),
      })
      .returns(a.ref("CognitoUser"))
      .handler(a.handler.function(createUserFunction)),

    setUserEnabled: a
      .mutation()
      .arguments({
        username: a.string().required(),
        enabled: a.boolean().required(),
      })
      .returns(a.string())
      .handler(a.handler.function(setUserEnabledFunction)),

    deleteUser: a
      .mutation()
      .arguments({
        username: a.string().required(),
      })
      .returns(a.string())
      .handler(a.handler.function(deleteUserFunction)),

    // =============================================
    // Group Management Types
    // =============================================
    CognitoGroup: a.customType({
      groupName: a.string().required(),
      description: a.string(),
      creationDate: a.datetime(),
      lastModifiedDate: a.datetime(),
    }),

    // Group Management Queries
    listGroups: a
      .query()
      .returns(a.ref("CognitoGroup").array())
      .handler(a.handler.function(listGroupsFunction)),

    listGroupsForUser: a
      .query()
      .arguments({
        username: a.string().required(),
      })
      .returns(a.ref("CognitoGroup").array())
      .handler(a.handler.function(listGroupsForUserFunction)),

    listUsersInGroup: a
      .query()
      .arguments({
        groupName: a.string().required(),
      })
      .returns(a.ref("CognitoUser").array())
      .handler(a.handler.function(listUsersInGroupFunction)),

    // Group Management Mutations
    createGroup: a
      .mutation()
      .arguments({
        groupName: a.string().required(),
        description: a.string(),
      })
      .returns(a.ref("CognitoGroup"))
      .handler(a.handler.function(createGroupFunction)),

    deleteGroup: a
      .mutation()
      .arguments({
        groupName: a.string().required(),
      })
      .returns(a.string())
      .handler(a.handler.function(deleteGroupFunction)),

    addUserToGroup: a
      .mutation()
      .arguments({
        username: a.string().required(),
        groupName: a.string().required(),
      })
      .returns(a.string())
      .handler(a.handler.function(addUserToGroupFunction)),

    removeUserFromGroup: a
      .mutation()
      .arguments({
        username: a.string().required(),
        groupName: a.string().required(),
      })
      .returns(a.string())
      .handler(a.handler.function(removeUserFromGroupFunction)),

    // =============================================
    // Department Master Model
    // =============================================
    Department: a
      .model({
        code: a.string().required(), // PK（不変・UI で強制）
        name: a.string().required(),
        sortOrder: a.integer(),
        notes: a.string(),
      })
      .identifier(["code"])
      .authorization((allow) => [allow.authenticated()]),

    // =============================================
    // Portal Models
    // =============================================
    Todo: a
      .model({
        content: a.string(),
      })
      .authorization((allow) => [allow.authenticated()]),

    Project: a
      .model({
        projectId: a.id().required(),
        name: a.string().required(),
        description: a.string(),
        urlDomain: a.string().required(), // ドメイン
        iconName: a.string(), // MUIアイコン
        color: a.string(), // カラーテーマ
        pages: a.hasMany("Page", "projectId"), // ProjectからPageへのリレーションシップ
      })
      .identifier(["projectId"])
      .authorization((allow) => [allow.authenticated()]),

    Page: a
      .model({
        pageId: a.id().required(),
        name: a.string().required(),
        description: a.string(),
        relativePath: a.string(), // 相対パス
        iconName: a.string(), // MUIアイコン
        projectId: a.string().required(),
        project: a.belongsTo("Project", "projectId"), // PageからProjectへのリレーションシップ
      })
      .identifier(["pageId", "projectId"])
      .secondaryIndexes((index) => [index("projectId")])
      .authorization((allow) => [allow.authenticated()]),

    // =============================================
    // Chat Models（外部テーブル参照 → a.model() に昇格）
    // =============================================
    ChatSession: a
      .model({
        projectId: a.string().required(),
        name: a.string(),
        messages: a.hasMany("ChatMessage", "sessionId"),
      })
      .authorization((allow) => [allow.owner()])
      .secondaryIndexes((index) => [index("projectId")]),

    ChatMessage: a
      .model({
        sessionId: a.id().required(),
        projectId: a.string().required(),
        role: a.ref("ChatRole").required(),
        content: a.string().required(),
        traces: a.json(),
        session: a.belongsTo("ChatSession", "sessionId"),
      })
      .authorization((allow) => [allow.owner()])
      .secondaryIndexes((index) => [index("sessionId")]),

    // =============================================
    // Asset Catalog Models
    // =============================================

    // 資産ステータス
    AssetStatusEnum: a.enum(["inStock", "lent", "inRepair", "disposed"]),

    AssetType: a
      .model({
        code: a.string().required(),
        name: a.string().required(),
        description: a.string(),
        sortOrder: a.integer(),
        assets: a.hasMany("Asset", "assetTypeId"),
      })
      .authorization((allow) => [
        allow.authenticated().to(["read"]),
        allow.groups(["workops_role_manager", "admin"]),
      ])
      .secondaryIndexes((index) => [index("code")]),

    Asset: a
      .model({
        departmentId: a.string().required(),
        name: a.string().required(),
        assetTypeId: a.id().required(),
        assetType: a.belongsTo("AssetType", "assetTypeId"),
        status: a.ref("AssetStatusEnum").required(),
        assigneeSub: a.string(),
      })
      .authorization((allow) => [
        // FIXME: ownerDefinedIn("departmentId") を同一フィールドに複数定義すると
        // ModelSubscriptionAssetFilterInput に departmentId が重複してスキーマエラーになる。
        // Amplify Gen2 の制約: https://github.com/aws-amplify/amplify-backend/issues/XXXX
        // 本来の認可設計:
        //   allow.ownerDefinedIn("departmentId").identityClaim("workops_dept_viewer").to(["read"]),
        //   allow.ownerDefinedIn("departmentId").identityClaim("workops_dept_editor").to(["create", "update"]),
        //   allow.ownerDefinedIn("departmentId").identityClaim("workops_dept_manager").to(["delete"]),
        allow.authenticated(), // 暫定: 認証済みユーザー全員に許可
        // ADMIN: 全部署・全操作
        allow.groups(["admin"]),
      ])
      .secondaryIndexes((index) => [
        index("departmentId").sortKeys(["status"]),
        index("assigneeSub").sortKeys(["status"]),
        index("assetTypeId"),
      ]),

    // =============================================
    // Request Manager Models
    // =============================================

    // 申請ステータスコード
    RequestStatusCode: a.enum([
      "draft",
      "submitted",
      "returned",
      "approved",
      "rejected",
      "withdrawn",
    ]),

    // 申請種別マスタ
    RequestType: a
      .model({
        code: a.string().required(),
        name: a.string().required(),
        description: a.string(),
        isActive: a.boolean().required(),
        sortOrder: a.integer(),
      })
      .authorization((allow) => [
        allow.authenticated().to(["read"]),
        allow.groups(["workops_role_manager", "admin"]),
      ])
      .secondaryIndexes((index) => [index("code")]),

    // 申請
    Request: a
      .model({
        departmentId: a.string().required(),
        requesterSub: a.string().required(),
        requestTypeId: a.id().required(),
        status: a.ref("RequestStatusCode").required(),
        title: a.string().required(),
        description: a.string(),
        amount: a.integer().required(),
        submittedAt: a.datetime(),
        approvedAt: a.datetime(),
        rejectedAt: a.datetime(),
        withdrawnAt: a.datetime(),
        returnedAt: a.datetime(),
      })
      .authorization((allow) => [
        // FIXME: ownerDefinedIn("departmentId") を同一フィールドに複数定義すると
        // ModelSubscriptionRequestFilterInput に departmentId が重複してスキーマエラーになる。
        // Amplify Gen2 の制約: https://github.com/aws-amplify/amplify-backend/issues/XXXX
        // 本来の認可設計:
        //   allow.ownerDefinedIn("departmentId").identityClaim("workops_dept_viewer").to(["read"]),
        //   allow.ownerDefinedIn("departmentId").identityClaim("workops_dept_editor").to(["create", "update"]),
        //   allow.ownerDefinedIn("departmentId").identityClaim("workops_dept_manager").to(["delete"]),
        allow.authenticated(), // 暫定: 認証済みユーザー全員に許可
        // ADMIN: 全部署・全操作
        allow.groups(["admin"]),
      ])
      .secondaryIndexes((index) => [
        index("departmentId").sortKeys(["status"]),
        index("requesterSub").sortKeys(["status"]),
        index("requestTypeId"),
      ]),
  })
  .authorization((allow) => [
    allow.authenticated(),
    allow.resource(preTokenGenerationFunction).to(["query"]),
    // AgentCore ツール Lambda に Data アクセス権を付与（AMPLIFY_DATA_DEFAULT_NAME 注入）
    allow.resource(assetToolCreate),
    allow.resource(assetToolDelete),
    allow.resource(assetToolGet),
    allow.resource(assetToolList),
    allow.resource(assetToolUpdate),
    allow.resource(assetTypeToolCreate),
    allow.resource(assetTypeToolList),
    allow.resource(requestToolCreate),
    allow.resource(requestToolGet),
    allow.resource(requestToolList),
    allow.resource(requestToolUpdate),
    allow.resource(requestTypeToolList),
  ]);

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: "userPool",
  },
});
