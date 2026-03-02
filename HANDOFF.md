# Goal

`workops-suite-monorepo` 側で既存 Gateway ツール登録の後に `Policy Engine` を `ENFORCE` でアタッチし、Asset / Request の各ツールに対する Cedar policy を自動作成する。  
ツール単位のロール制御のみを Cedar で扱い、部署スコープやセルフ承認禁止は既存 Tool / AppSync 側の責務に残す。

# Current Progress

- 既存の Policy Engine 関連ファイルは維持している
  - `packages/shared-backend/amplify/bedrock-agentcore/policy/policy-statements.ts`
  - `packages/shared-backend/amplify/bedrock-agentcore/policy/resource.ts`
  - `packages/shared-backend/amplify/function/policy/attach-policy-engine/handler.ts`
  - `packages/shared-backend/amplify/function/policy/upsert-policy/handler.ts`
- `packages/shared-backend/amplify/backend.ts` は `createGatewayPolicyResources` を呼ぶ構成に整理済み
  - `createAssetGatewayTargets(...)` の戻り値を `assetPolicies` として受ける
  - `createRequestGatewayTargets(...)` の戻り値を `requestPolicies` として受ける
  - `createGatewayPolicyResources(...)` にそれぞれ渡す
  - Asset / Request の policy stack を target stack の後段に依存させる
- `packages/shared-backend/amplify/bedrock-agentcore/policy/policy-statements.ts` は最小責務に整理済み
  - `gatewayTargetName` と `minimumRole` だけから `GatewayPolicyDefinition` を生成する
  - `actionName` は `${gatewayTargetName}___${gatewayTargetName}` で固定生成する
  - fallback 用 optional 項目は削除済み
- `packages/shared-backend/amplify/bedrock-agentcore/gateway/asset/resource.ts` は最小差分で修正済み
  - 既存の上から順の target 定義は維持
  - 各 target の直後に `policies.push(...)` を追加
  - `createGatewayTargets(...)` の戻り値を `GatewayPolicyDefinition[]` に変更
- `packages/shared-backend/amplify/bedrock-agentcore/gateway/request/resource.ts` も同様に修正済み
  - 既存の上から順の target 定義は維持
  - 各 target の直後に `policies.push(...)` を追加
  - `createGatewayTargets(...)` の戻り値を `GatewayPolicyDefinition[]` に変更

現在の Cedar マッピングは以下で実装している。

- Asset
  - `viewer`: `search-asset-knowledge-base`, `list-assets`, `get-asset`, `list-asset-types`
  - `editor`: `create-asset`, `update-asset`
  - `manager`: `delete-asset`, `create-asset-type`
- Request
  - `viewer`: `search-request-knowledge-base`, `get-request`, `list-requests`, `list-request-types`
  - `editor`: `create-request`, `update-request`, `submit-request`, `withdraw-request`
  - `manager`: `approve-request`, `reject-request`, `return-request`

# What Worked

- `policy-engine-test` の custom resource handler をほぼそのまま Monorepo に移植できた
- `backend.ts` の既存 Asset / Request ターゲット登録構成は崩さず、policy stack を後段追加する形で組み込めた
- `createXxxGatewayTargets(...)` の戻り値として policy 配列を返す形にすると、`backend.ts` の二重管理を消せた
- `asset/resource.ts` と `request/resource.ts` で、既存の上から順の tool 定義を保ったまま policy を生成する形は user の意図と一致した
- `npx tsc -p packages/shared-backend/amplify/tsconfig.json --noEmit` は通過した

# Next Steps

1. `packages/shared-backend/amplify/backend.ts` の差分が user の期待どおりか再確認する
2. `ampx sandbox` または synth 相当で Amplify backend 生成が壊れていないか確認する
3. deploy 後に以下を確認する
   - Gateway に `Policy Engine` が `ENFORCE` でアタッチされること
   - Asset / Request 用の policy が作成されること
   - viewer/editor/manager/admin でツール可否が docs 通りになること
4. `department scope` と `self-approval` は Cedar に入れていない前提なので、必要なら後続で Tool 側ガードの検証を追加する

# What Didn't Work

- `gateway/resource.ts` を配列定義 + helper 関数で共通化する大きめのリファクタ
  - user に明確に reject された
  - `coding-convention` の「過度な共通化を避ける」に反する
  - 次の担当はこの方向に戻さないこと
- fallback 用の optional 項目を `policy-statements.ts` に持たせること
  - user に reject された
  - `gatewayTargetName` と `minimumRole` だけで十分
