# フロントエンド統合計画（Phase 2）

## Context

バックエンド統合（Phase 1）完了済み。3つのフロントエンドアプリを
`apps/` 配下に配置し、`packages/shared-backend` の単一バックエンドに向ける。

**前提**:
- `workops-suite-monorepo/package.json` は既に `apps/*` / `packages/*` をワークスペース定義済み
- 各アプリは React 18 + Vite + React Router DOM v7 + MUI 7 + CASL 6（全て共通）
- vite.config.ts / tsconfig.json にパスエイリアスなし（共通）
- Chat 機能（asset-catalog / request-manager）: AgentCore Runtime URL はダミー対応

## ファイル構成（統合後）

```
apps/
├── portal/         （c:\git\workops-suite-portal の src 等をコピー）
├── asset-catalog/  （c:\git\workops-suite-asset-catalog の src 等をコピー）
└── request-manager/（c:\git\workops-suite-request-manager の src 等をコピー）
```

**各 app にコピーするもの（amplify/ ディレクトリは除く）**:
- `src/`, `public/`, `index.html`
- `package.json`（要修正）
- `tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json`
- `vite.config.ts`（要修正）
- `eslint.config.js`

## 実装ステップ

### Step 1: 各アプリを apps/ にコピー

ソース → コピー先:
| ソース | コピー先 |
|--------|----------|
| `c:\git\workops-suite-portal` | `apps/portal/` |
| `c:\git\workops-suite-asset-catalog` | `apps/asset-catalog/` |
| `c:\git\workops-suite-request-manager` | `apps/request-manager/` |

### Step 2: amplify_outputs.json インポートパス変更（全アプリ）

各アプリの `src/main.tsx` を修正:
```typescript
// Before
import outputs from "../amplify_outputs.json";
// After
import outputs from "../../packages/shared-backend/amplify_outputs.json";
```

### Step 3: vite.config.ts に @workops/data-schema エイリアス追加（全アプリ）

各 `apps/*/vite.config.ts`:
```typescript
import { resolve } from "path";
// defineConfig 内に追加:
resolve: {
  alias: {
    "@workops/data-schema": resolve(
      __dirname,
      "../../packages/shared-backend/amplify/data/resource"
    ),
  },
},
```

### Step 4: tsconfig.app.json にパスエイリアス追加（全アプリ）

各 `apps/*/tsconfig.app.json`（または tsconfig.json）の `compilerOptions` に追加:
```json
"paths": {
  "@workops/data-schema": ["../../packages/shared-backend/amplify/data/resource"]
}
```

### Step 5: Schema 型インポートパスを一括置換（全アプリ）

各アプリの `src/` 以下で以下のパターンを検索して置換:
```
// Before（相対パス、deep に応じて ../の数が変わる）
from "../../../../amplify/data/resource"
from "../../../../../amplify/data/resource"
// After（全て同じ）
from "@workops/data-schema"
```

対象ファイル: `generateClient<Schema>` または `type { Schema }` を import している全 `.ts`/`.tsx`

### Step 6: package.json の整理（全アプリ）

**削除する deps**（amplify/ バックエンド用の deps。src/ では未使用）:
- `@aws-amplify/backend`
- `@aws-amplify/backend-cli`
- asset-catalog/request-manager のみ:
  - `@aws-sdk/client-bedrock-agentcore`（fetch 直呼びのため不要）
  - `@aws-sdk/client-bedrock-runtime`
  - `@aws/run-mcp-servers-with-aws-lambda`
  - `@modelcontextprotocol/sdk`
  - `@dotenvx/dotenvx`
  - `playwright`

**残すもの**: `aws-amplify`（クライアントライブラリ）は必須

### Step 7: Chat データ操作をモデル操作に書き換え（asset-catalog / request-manager）

対象ファイル: `src/features/chatBot/hooks/useSessions.ts` と `useChatBot.ts`

**useSessions.ts の変換**:

| 変換前（VTL カスタムクエリ） | 変換後（a.model() 操作） |
|------------------------------|--------------------------|
| `client.queries.listSessions({ projectId, limit })` | `client.models.ChatSession.listChatSessionByProjectId({ projectId }, { limit })` |
| `client.mutations.createSession({ projectId, sessionId, name })` | `client.models.ChatSession.create({ projectId, name })` |
| `client.mutations.updateSession({ projectId, sessionId, name })` | `client.models.ChatSession.update({ id: sessionId, name })` |
| `client.mutations.deleteSession({ projectId, sessionId })` | `client.models.ChatSession.delete({ id: sessionId })` |

**注意**: 旧モデルの `sessionId` = 新モデルの auto-generated `id`。
`create` レスポンスの `data.id` を sessionId として使用する。

**useChatBot.ts の変換**:

| 変換前（VTL カスタムクエリ） | 変換後（a.model() 操作） |
|------------------------------|--------------------------|
| `client.queries.getSession({ projectId, sessionId })` | `client.models.ChatSession.get({ id: sessionId })` |
| `client.queries.listMessages({ sessionId, limit, nextToken, direction })` | `client.models.ChatMessage.listChatMessageBySessionId({ sessionId }, { limit, nextToken })` |
| `client.mutations.createMessage({ sessionId, role, content, traces })` | `client.models.ChatMessage.create({ sessionId, projectId, role, content, traces })` |
| `client.mutations.deleteMessage({ sessionId, messageId })` | `client.models.ChatMessage.delete({ id: messageId })` |

**sortDirection**: 旧クエリは `direction: "ASC"/"DESC"` を持つが、新モデルは
`.listChatMessageBySessionId()` に `{ sortDirection: "ASC" | "DESC" }` を渡す。

### Step 8: backend.ts にダミーの agentCoreRuntimeArn を custom 出力（shared-backend）

対象ファイル: `packages/shared-backend/amplify/backend.ts`

`backend.addOutput()` でダミー ARN を `amplify_outputs.json` の `custom` に書き出す:

```typescript
// backend.ts 末尾に追加
backend.addOutput({
  custom: {
    // FIXME: 実際の AgentCore Runtime ARN が決まったらここを置き換える
    agentCoreRuntimeArn:
      "arn:aws:bedrock-agentcore:ap-northeast-1:000000000000:runtime/dummy",
  },
});
```

これにより `amplify_outputs.json` に以下が出力される:
```json
{
  "custom": {
    "agentCoreRuntimeArn": "arn:aws:bedrock-agentcore:ap-northeast-1:000000000000:runtime/dummy"
  }
}
```

フロントエンド側（`useChatBot.ts`）の読み取りコードは**変更不要**:
```typescript
// 変更なし
const runtimeArn = outputs.custom.agentCoreRuntimeArn;
const region = outputs.auth.aws_region;
const url = `https://bedrock-agentcore.${region}.amazonaws.com/runtimes/${encodeURIComponent(runtimeArn)}/invocations`;
```

### Step 9: npm install

```bash
cd c:/git/workops-suite-monorepo
npm install
```

## 変更しないもの

- 既存3リポジトリ（コピー元）は一切触らない
- `packages/shared-backend/` は触らない
- モノレポルート `package.json` / `tsconfig.json`（変更不要）

## 検証方法

```bash
# 各アプリの型チェック
cd apps/portal && npx tsc --noEmit
cd apps/asset-catalog && npx tsc --noEmit
cd apps/request-manager && npx tsc --noEmit

# 各アプリの dev サーバー起動
cd apps/portal && npm run dev
cd apps/asset-catalog && npm run dev
cd apps/request-manager && npm run dev
```

amplify_outputs.json は `packages/shared-backend/` で `ampx sandbox` を実行して生成しておく必要がある。
