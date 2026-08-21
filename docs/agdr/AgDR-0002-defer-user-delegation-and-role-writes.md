---
id: AgDR-0002
title: 本人委任とrole別副作用toolを保留し、安全な解除条件を固定する
status: accepted
date: 2026-08-21
deciders:
  - WorkOps project owner
  - Codex
---

# 本人委任とrole別副作用toolを保留し、安全な解除条件を固定する

## 1. 目的

最終要求は、Cognito利用者本人をGateway/Cedar principalとしてrole別toolを強制することである。

しかし、現行Managed HarnessのAuthorization Code adapterと公開APIは、authorization URL、callback、session binding、Harness resumeを一つの確証済み経路として閉じていない。

本人identityを推測したり、machine identityを本人として扱ったりして副作用toolを許可しない。

現在はexact Harness roleへViewer read-onlyだけをpermitし、本人委任とrole別副作用toolを明示的に保留する。

AWS公式surfaceが揃った後、認証・認可面だけを小さく切り替えられる状態を保つ。

## 2. Context

- Harness inboundはCognito CUSTOM_JWTである。
- BFFはBrowserのaccess tokenをBearerとしてHarnessへ一回中継する。
- Harness native `agentcore_gateway`は現在`outboundAuth.awsIam`を使う。
- Gateway authorizerはAWS_IAMである。
- Cedar principalはHarness execution roleのexact `AgentCore::IamEntity`である。
- IAM principalは元利用者の`sub`、role、department claimではない。
- Policy Engineは`ENFORCE`である。
- Viewer相当のread-only八toolだけにpermitを作る。
- 現行AWS公式資料はIdentity Authorization Codeの個別APIを公開するが、Harness固有のauthorization URL伝搬とresume契約を明記しない。
- 過去のManaged Harness v5/v6では`GetResourceOauth2Token.resourceOauth2ReturnUrl`不足を実測した。

## 3. Options Considered

| Option | Pros | Cons |
|---|---|---|
| native Authorization Codeを推測で完成させる | 最終構成へ近付ける可能性 | 型にないcallback、session、resumeをWorkOpsが所有し、同一利用者保証がない |
| BFFがIdentity tokenを先取りする | token取得順を制御できる | Managed Harness/Identityの責務をBFFへ移し、service-linked caller失敗と権限拡大を生む |
| Client Credentialsへ変換する | machine tokenでCUSTOM_JWT Gatewayを呼べる可能性 | 本人principalにならず、secret、provider、scope、IAMが増える |
| IAMで全role toolを許可する | 機能を提供できる | 全利用者が同じHarness roleになり、権限分離が消える |
| IAMでViewer read-onlyだけを許可する | 本人claimがなくても安全側へ閉じ、Cedar ENFORCEを使える | role別副作用toolを提供できない |
| 全機能を停止する | 誤許可がない | 安全な参照機能まで失う |

## 4. Decision

Chosen: **IAMでViewer read-onlyだけを許可し、本人委任とrole別副作用toolを保留する**。

理由は、現在のprincipalで証明できるのはHarness execution roleだけであり、元利用者claimを確認できない状態で副作用toolを許可してはならないためである。

本人委任へ戻すときも、BFFへmanual protocolを追加せず、AWS native `agentcore_gateway`とAgentCore Identityの公開契約だけを使う。

## 5. 現在の認証・認可境界

```text
Cognito access token
  │
  ├─ API Gateway: scopeとtoken検証
  │
  └─ Managed Harness CUSTOM_JWT: inbound検証
       │
       └─ Harness execution role SigV4
            │
            └─ Gateway AWS_IAM
                 │
                 └─ Cedar AgentCore::IamEntity
                      ├─ Viewer八action: permit
                      └─ その他: default deny
```

入口で利用者JWTを二度検証しても、Gateway principalは利用者本人にはならない。

この差を「identity伝搬」と表現しない。

## 6. 現在permitするtool

1. `search-asset-kb`
2. `list-assets`
3. `get-asset`
4. `list-asset-types`
5. `search-request-kb`
6. `get-request`
7. `list-requests`
8. `list-request-types`

更新、削除、承認targetが存在しても、現在はpermitしない。

## 7. 意図的に実装しない項目

### D-IDENTITY-01 元利用者`sub`のCedar principal

| 項目 | 内容 |
|---|---|
| 元の要求 | Cognito access tokenの`sub`を`AgentCore::OAuthUser` principalにする |
| 現在 | Harness execution roleの`AgentCore::IamEntity` |
| 理由 | IAM outboundは元JWTをGatewayへ提示しない |
| 代替 | exact Harness roleへread-only八actionだけをpermit |
| 劣後 | 利用者別policy、本人別監査、本人claimを使う入力補正 |
| 禁止 | IAM principalへ`sub`を文字列合成する、LLM入力の`sub`を信頼する、独自headerでJWTを注入する |

### D-IDENTITY-02 JWT role claimによるtool権限

| 項目 | 内容 |
|---|---|
| 元の要求 | Viewer、Editor、Manager、Global Adminの能力差をCedarで強制する |
| 現在 | 全利用者をViewer相当へ固定 |
| 理由 | Cedarへ検証済みrole claimが届かない |
| 代替 | read-only八tool以外はdefault deny |
| 劣後 | Editor作成・更新、Manager削除・承認、Global Admin能力 |
| 禁止 | BFF role-tool表を認可正本にする、Harness `allowedTools`だけで保護する、UI非表示だけで保護する |

### D-IDENTITY-03 更新・削除・承認操作

| 項目 | 内容 |
|---|---|
| 元の要求 | 許可roleだけが副作用toolを実行する |
| 現在 | 副作用toolをpermitしない |
| 理由 | 本人principalとroleを強制できない |
| 代替 | 検索・一覧・取得だけを提供 |
| 禁止 | 全利用者をmanager扱いする、BFFの先行判定だけでTargetを呼ぶ |

対象には少なくとも次を含む。

- `create-asset`
- `update-asset`
- `delete-asset`
- `create-asset-type`
- `create-request`
- `update-request`
- `submit-request`
- `withdraw-request`
- `approve-request`
- `reject-request`
- `return-request`

### D-IDENTITY-04 native Authorization Code outbound

| 項目 | 内容 |
|---|---|
| 元の要求 | HarnessがAgentCore Identityから本人委任tokenを得る |
| 現在 | `outboundAuth.awsIam` |
| 理由 | adapterのreturn URL不足と、Harness固有callback/resume契約の未公開 |
| 代替 | secretを持たないIAM outbound |
| 禁止 | BFFの`GetWorkloadAccessTokenForJWT`、`GetResourceOauth2Token`直接呼出し、推測callback、推測`sessionUri`、二度目のlogin |

### D-IDENTITY-05 JWT前提Gateway interceptor

| 項目 | 内容 |
|---|---|
| 元の要求 | 検証済みclaimから`departmentId`、`requesterSub`、approver identityを補正する |
| 現在 | Gatewayへ関連付けない |
| 理由 | IAM requestには元利用者Bearerがない |
| 代替 | 本人入力を必要とする副作用toolを許可しない |
| 禁止 | tool引数のrole、sub、departmentを信頼する |

## 8. 永続的に導入しない回避策

次は解除待ちではなく、現在の設計原則として導入しない。

- BFF Gateway MCP client。
- BFF `tools/list`、`tools/call`。
- BFF role-tool認可。
- BFF `tool_use`回収。
- BFF tool result再投入。
- BFF pause、resume、最大round loop。
- BFFによるWorkload Identity tokenまたはResource OAuth token先取り。
- WorkOps独自OAuth callback event。
- 未確認のauthorization URL、session URI、resume field。
- Client Credentialsによる本人identity代替。
- Custom RuntimeまたはStrands loopへの切替。
- 利用者への追加login依頼。

## 9. 解除条件

### G-AUTH-01 公式surface

次の値について、名称、型、返却主体、受取主体、lifecycleがAWS公式API、SDK型、または相互参照された公式資料に明記される。

- authorization URL。
- callback URLまたはreturn URL。
- OAuth `state`または同等のCSRF相関値。
- AgentCore Identity `sessionUri`。
- Harness runtime sessionとの対応方法。
- callback完了後の同一interaction再開方法。

公式資料に個別APIが存在するだけでは合格にしない。

Harness native `agentcore_gateway`からBrowser callback、Gateway invocationまで一系列で接続できる必要がある。

### G-AUTH-02 同一利用者

次を証明する。

1. BrowserでCognito loginした利用者。
2. Harness CUSTOM_JWT inboundで検証された利用者。
3. Identity Authorization Codeを開始した`userIdentifier`。
4. callbackで同意した利用者。
5. Gatewayの`AgentCore::OAuthUser` principal。
6. Cedarが読む`sub`とrole claim。

これらが同一であることを、アプリケーションの推測ではなく公開契約と実traceで確認する。

### G-AUTH-03 追加login禁止

- ユーザーへlogin操作を依頼しない。
- 既存Cognito login後に別のManaged Login画面を開かない。
- 同じCognito User Poolに対する再認証を要求しない。
- OAuth同意が必要な仕様なら、既存loginを再要求しないことを実測する。
- E2E中の資格情報入力はCodex自身が一時userで行い、ユーザー操作を要求しない。

### G-AUTH-04 Managed Harness責務

- Harnessにnative `agentcore_gateway`だけを登録する。
- Managed Harnessがtool discovery、tool call、agent loopを所有する。
- BFFはHarnessを一回invokeするだけである。
- BFFにmanual pause、resume、toolResult、round制御を追加しない。

### G-AUTH-05 Gateway/Cedar

- Gateway authorizerはCUSTOM_JWT。
- Policy Engineは`ENFORCE`。
- principalは`AgentCore::OAuthUser`。
- role claimはprincipal tagとして評価できる。
- Viewer read ALLOW。
- Viewer write DENY。
- EditorまたはManagerの代表write ALLOW。
- Global Adminの代表allowを確認する。
- DENY時にTargetへ到達しない。
- BFFまたはFrontendが拒否主体ではない。

### G-AUTH-06 変更範囲

本人委任への変更は次の四領域へ収まる。

1. Harness outbound auth。
2. Gateway authorizer。
3. Cedar principalとrole policy。
4. JWT interceptorの再接続。

BFF、Frontend、Managed Memory、native Gateway tool、Target Lambdaを全面的に作り直す必要がある場合は不合格とする。

### G-AUTH-07 証拠

- 公式契約またはSDK型。
- synth後template。
- 実Harness、Gateway、Policy Engine、Policy状態。
- Managed Harness runtime log。
- Gateway Initialize、`tools/list`、`tools/call` span。
- Cedar `PartiallyAuthorizeActions`と`AuthorizeAction` span。
- Target Lambda到達または未到達。
- ユーザー操作なしのPlaywright E2E。
- cleanup記録。

すべてを満たすまでD-IDENTITY-01から05を解除しない。

## 10. 本人委任への切替手順

1. 既存の`F-IDENTITY-*` Claimを確認する。
2. AWS変更によって無効になったClaimだけを差分調査する。
3. SDK/API最小確認で公開surfaceを確認する。
4. 必要な場合だけ別identifierの隔離sandboxを使う。
5. Cognito domainとPolicy物理名の衝突を確認する。
6. one tool、one principalでOAuthUserを確認する。
7. Viewer read ALLOWとwrite DENYを確認する。
8. DENY時Target未到達を確認する。
9. role別policyを段階的に追加する。
10. Supported UIでread、deny、許可writeを確認する。
11. 一時user、session、tab、localhost、失敗stackをcleanupする。
12. IAM方式から切り替える。

## 11. 変更箇所

| 領域 | 現在 | 解除後 |
|---|---|---|
| Harness tool outbound | `awsIam` | 公式OAuth credential provider |
| Gateway authorizer | AWS_IAM | CUSTOM_JWT |
| Cedar principal | exact `IamEntity` | `OAuthUser`とJWT tag |
| Cedar policy | Viewer八action | role別action |
| Gateway interceptor | 未接続 | claim検証前提で再接続 |
| BFF | Bearer Harness invoke一回 | 変更しない |
| Managed Harness loop | native | 変更しない |
| Gateway tool | native一件 | 変更しない |
| Memory | managed | 変更しない |

## 12. ロールバック

本人委任への移行が一条件でも失敗した場合は次へ戻す。

1. Harness outboundを`awsIam`へ戻す。
2. Gateway authorizerをAWS_IAMへ戻す。
3. Cedarをexact Harness roleのViewer八policyへ戻す。
4. JWT interceptorを外す。

ロールバック時にinline bridge、Custom Runtime、Client Credentials、独自callbackを導入しない。

## 13. Consequences

- 現在の誤許可範囲をread-onlyへ閉じられる。
- Cedar ENFORCEを実際の拒否主体にできる。
- 本人identityを未証明のまま提供済みと表現しない。
- Editor、Manager、Global Adminの副作用操作は利用できない。
- AWS修正後の変更面を限定できる。
- 解除には公開契約と実E2Eの両方が必要になる。

## 14. Verification

- exact Harness roleに対するread ALLOWを確認済み。
- 非Harness principalのdirect write DENYを確認済み。
- DENY後のTarget Lambda event 0件を確認済み。
- Supported UIのwrite要求がCedar `denied_tools`になることを確認済み。
- BFFにMCP client、role表、manual loopがないことを現行ソースで確認済み。
- 本人OAuthUserとrole別writeは未確認であり、未達のまま維持する。

## 15. Artifacts

- `docs/agdr/AgDR-0001-adopt-managed-harness-native-architecture.md`
- `docs/research/agentcore/01-official-contracts-and-open-surfaces.md`
- `docs/research/agentcore/02-current-implementation-and-live-results.md`
- `docs/research/agentcore/03-ruled-out-options-and-failure-results.md`
- `docs/research/agentcore/04-verification-and-revalidation-runbook.md`
- `docs/research/agentcore/05-research-results-index.md`
- `packages/shared-backend/amplify/bedrock-agentcore/constructs/harness.ts`
- `packages/shared-backend/amplify/bedrock-agentcore/constructs/tool-gateway.ts`
- `packages/shared-backend/amplify/bedrock-agentcore/policy/policy-statements.ts`
