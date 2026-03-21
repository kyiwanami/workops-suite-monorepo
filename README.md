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
│       │   └── bedrock-agentcore/ # AgentCore（Gateway/Memory/Browser/Runtime）
│       │       ├── constructs/    # CDK Constructs
│       │       ├── gateway/       # Gatewayツール登録
│       │       ├── policy/        # Cedar Policy
│       │       └── runtime/       # Python AgentCore実装
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
- `ChatSession`: チャットセッション
- `ChatMessage`: チャットメッセージ
- `Department`: 部門
- その他ビジネスロジック用テーブル

**Lambda関数**:
- ユーザー操作（list/get/create/enable/disable/delete）
- グループ操作（list/create/delete/add-user/remove-user）
- DynamoDB Stream処理（Department → Cognito Group 同期）
- Pre-token generation

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

### AgentCore Runtime（Chat機能）

- Asset Catalog・Request Manager の Chat 機能は AWS Bedrock AgentCore Runtime を呼び出します
- Runtime ARN は `amplify_outputs.json` の `custom.agentCoreRuntimeArn` から取得されます
- AgentCore（Gateway / Memory / Browser / Runtime）は shared-backend の Amplify デプロイで自動プロビジョニングされます

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

## 🔐 セキュリティ

- **認証**: Cognito User Pool
- **認可**: CASL ベースのロールベースアクセス制御（RBAC）
- **API**: IAM ポリシーによる最小権限の付与
- **データ暗号化**: DynamoDB/Cognito は AWS 管理キーで自動暗号化