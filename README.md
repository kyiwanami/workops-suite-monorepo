# Workops Suite - Monorepo

複数の業務アプリケーション（資産管理、申請管理）を一元管理し、AI チャットボット（AWS Bedrock）を通じて自然言語で検索・質問できるエンタープライズ向け統合管理プラットフォーム。

## 📁 ディレクトリ構成

```
workops-suite-monorepo/
├── apps/                          # フロントエンドアプリケーション
│   ├── portal/                    # ポータル（管理画面）
│   ├── asset-catalog/             # 資産カタログ（Chat機能付き）
│   └── request-manager/           # 申請マネージャー（Chat機能付き）
├── packages/
│   └── shared-backend/            # 共有バックエンド基盤（Amplify Gen2）
│       ├── amplify/               # バックエンド定義（CDK/TypeScript）
│       │   ├── auth/              # 認証設定（Cognito）
│       │   ├── data/              # データモデル定義
│       │   ├── function/          # Lambda関数
│       │   ├── bedrock/           # Bedrock Knowledge Base
│       │   ├── storage/           # S3バケット
│       │   ├── s3vectors/         # S3 Vector Store
│       │   └── bedrock-agentcore/ # AgentCore（Managed Harness/Gateway/Policy）
│       │       ├── constructs/    # CDK Constructs
│       │       ├── gateway/       # Gatewayツール登録
│       │       └── policy/        # Cedar Policy
│       └── amplify_outputs.json   # ビルド出力（バックエンド設定）
├── package.json                   # Workspace定義
└── README.md                      # このファイル
```

## 📱 フロントエンドアプリケーション

### Portal（ポータル）
```bash
cd apps/portal
npm run dev      # 開発サーバー起動 (http://localhost:5173)
npm run build    # プロダクションビルド
npm run preview  # ビルド後のプレビュー
```

ユーザー・グループ管理など、全体的な管理機能を提供します。

### Asset Catalog（資産カタログ）
```bash
cd apps/asset-catalog
npm run dev      # 開発サーバー起動
npm run build
npm run preview
```

資産情報の検索・閲覧とAIチャットボット機能を提供します。

### Request Manager（申請マネージャー）
```bash
cd apps/request-manager
npm run dev      # 開発サーバー起動
npm run build
npm run preview
```

申請管理とAIチャットボット機能を提供します。

## ⚙️ バックエンド

### 構成

**認証**: AWS Cognito User Pool
- ユーザー・グループ管理
- Pre-token generation トリガー（カスタムクレーム追加）

**データモデル**:
- `Department`: 部門
- 資産・資産種別
- 申請・申請種別
- その他ビジネスロジック用テーブル

**Lambda関数**:
- ユーザー操作（list/get/create/enable/disable/delete）
- グループ操作（list/create/delete/add-user/remove-user）
- DynamoDB Stream処理（Department → Cognito Group 同期）
- Pre-token generation
- AgentCore BFF

## 🔗 フロントエンド ↔ バックエンド連携

### Data Schema インポート

すべてのフロントエンドアプリは、共有バックエンドのスキーマを使用します。

```typescript
import type { Schema } from "@workops/data-schema";
const client = generateClient<Schema>();
```

`@workops/data-schema` は以下にリゾルブされます：
```
packages/shared-backend/amplify/data/resource
```

### Amplify 出力

バックエンド設定（認証情報、エンドポイント等）は以下から自動的に読み込まれます：
```
packages/shared-backend/amplify_outputs.json
```

### AgentCore（Chat機能）

- Asset Catalog・Request Manager の Chat 機能は単一の AWS Bedrock AgentCore Managed Harness を共有します
- BrowserからのCognito access tokenはAPI GatewayとManaged Harnessで検証されます
- Managed Harnessがagent loop、Managed Memory、native Gateway toolを所有します
- AgentCore BFFはBearerの中継、Memory API、raw text streamingだけを担当します
- GatewayはAWS IAMでHarnessを認証し、Policy EngineはCedarをENFORCEで適用します
- 現在はHarness execution roleをprincipalとするViewer相当のread-only toolだけを許可します
- Agent API URLは`amplify_outputs.json`の`custom.agentRestApiUrl`から取得されます

詳細は[WorkOps AgentCore現行構成](docs/architecture/agentcore-modernization.md)を参照してください。

## 🛠️ 開発ワークフロー

### 型チェック

```bash
# 全アプリの型チェック
cd apps/portal && npx tsc --noEmit
cd apps/asset-catalog && npx tsc --noEmit
cd apps/request-manager && npx tsc --noEmit
```

### コーディング規約

実装時は以下を参照してください：
- `/coding-convention` - プロジェクト全体の実装方法
- `typescript-coding-standards` - TypeScript 型安全性の規約

## 📦 Tech Stack

### フロントエンド（全アプリ共通）
- **フレームワーク**: React 18
- **ビルドツール**: Vite
- **ルーティング**: React Router DOM v7
- **UI**: Material-UI 7
- **認可**: CASL 6
- **フォーム**: React Hook Form
- **バリデーション**: Zod

### バックエンド
- **FaaS**: AWS Lambda
- **データベース**: Amazon DynamoDB
- **認証**: Amazon Cognito
- **API**: AWS AppSync (Amplify Data)
- **IaC**: AWS CDK

## 📊 可観測性（Observability）

| レイヤー | 手段 | 備考 |
|---------|------|------|
| Managed Harness | AgentCore Runtime logs / X-Ray | AWS管理のagent loopを観測 |
| Gateway / Cedar | Gateway TRACES delivery / X-Ray | Policy spanで認可判定を確認 |
| Lambda 関数（全30+個） | CloudWatch Logs（90日保持） | `defineFunction` の `logging.retention` で設定済み |

アカウント単位のTransaction Searchとsamplingを含む手順は、[AgentCore検証・再検証runbook](docs/research/agentcore/04-verification-and-revalidation-runbook.md)を参照してください。

## 🔐 セキュリティ

- **認証**: Cognito User Pool、API Gateway Cognito authorizer、Managed Harness CUSTOM_JWT
- **Gateway認証**: Harness execution roleによるAWS IAM
- **実行時認可**: Gateway Policy EngineによるCedar ENFORCE
- **データ暗号化**: DynamoDB/Cognito は AWS 管理キーで自動暗号化
