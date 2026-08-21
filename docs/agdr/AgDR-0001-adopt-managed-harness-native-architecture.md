---
id: AgDR-0001
title: Managed Harness native構成を採用し、IAM read-onlyを現在の運用地点とする
status: accepted
date: 2026-08-21
deciders:
  - WorkOps project owner
  - Codex
---

# Managed Harness native構成を採用し、IAM read-onlyを現在の運用地点とする

## 1. 決定の要約

WorkOpsが実現したいことは変わっていない。

変わったのは、現行AWSで採用する設計判断と、最終要求へ到達する順序である。

現行Managed Harnessの本人委任契約は、authorization URL、callback、session binding、resumeまで実行時に閉じていない。

推測したOAuth protocol、BFF manual tool loop、Custom Runtimeを導入せず、確認済みのAWS契約だけでmanaged loopとGateway最終認可境界を成立させる。

そのため、Managed Harness native `agentcore_gateway`、IAM outbound、AWS_IAM Gateway、Cedar `ENFORCE`、Viewer相当read-onlyを現在の運用地点として採用する。

本人principalとrole別副作用toolは、AgDR-0002の解除条件が満たされるまで提供しない。

| 観点 | 最終要求 | 現在の設計 | 判定 |
|---|---|---|---|
| login | Cognito loginは一度だけ | Browserのaccess tokenをBFFがHarnessへBearer中継 | 達成 |
| agent loop | AWS managed serviceが所有 | Managed Harnessが所有 | 達成 |
| tool接続 | native Gateway tool | `agentcore_gateway`一件 | 達成 |
| BFF | thin relay | 一回の`InvokeHarness`、Memory API、raw text streaming | 達成 |
| 最終認可 | Gateway/Cedar | AWS_IAM Gateway、Cedar `ENFORCE` | 達成 |
| principal | 元利用者`sub` | Harness execution role | 意図的劣後 |
| role別能力 | Viewer、Editor、Manager、Global Admin | Viewer相当read-only八tool | 意図的劣後 |
| MCP | managed clientとGatewayの実動revision | `2025-11-25`単独 | 達成 |
| 観測 | AWS標準trace | Policy span、Gateway span、Lambda log | 達成 |

本人principalとrole別副作用toolを「完成済み」とは扱わない。

IAM read-onlyは最終設計ではなく、Managed Harness native構造を崩さず、AWS修正後の差替え面を限定する現在の運用判断である。

## 2. 目的と完了条件

### 2.1 変更しない目的

最終形は次である。

```text
Browser
  ↓ Cognito access token
API Gateway / BFF
  ↓ 同じBearerを一回だけ中継
Managed Harness CUSTOM_JWT inbound
  ↓ managed agent loop
native agentcore_gateway
  ↓ AgentCore Identityによる本人委任
Gateway CUSTOM_JWT
  ↓ OAuthUser principalとJWT role claim
Cedar ENFORCE
  ↓ permit時だけ
業務Lambda
```

次は最終要求ではない。

- 既存inline bridgeとの互換を維持すること。
- BFFへAWS service間の不足を埋めるmanual protocolを実装すること。
- Custom Runtimeへagent loopを移すこと。
- machine identityを本人identityと同等に扱うこと。

### 2.2 現在方式の完了条件

1. Cognito login済み利用者のBearerでHarnessを呼べる。
2. 利用者へ追加loginを要求しない。
3. Managed Harnessがagent loopとManaged Memoryを所有する。
4. Harnessにはnative `agentcore_gateway`だけを登録する。
5. BFFにGateway MCP clientが存在しない。
6. BFFにrole別tool認可、pause、resume、tool result再投入、round loopが存在しない。
7. GatewayはAWS_IAMでHarness execution roleを認証する。
8. Cedarはexact Harness roleにread-only八actionだけをpermitする。
9. Policy Engineは初回作成時から`ENFORCE`である。
10. read要求はCedar ALLOW、Target到達、UI回答まで成功する。
11. write要求はCedar DENYまたはtool非公開となり、Targetへ到達しない。
12. MCP `2025-11-25`をManaged Harness自身がnegotiationする。
13. 内部protocolと例外をUIへ露出しない。
14. AWS修正後の本人委任への変更面がAgDR-0002の範囲に収まる。

### 2.3 最終要求との差

| 差分ID | 未達内容 | 現在の安全側代替 | 詳細正本 |
|---|---|---|---|
| D-IDENTITY-01 | 元利用者`sub`のCedar principal | exact Harness role | AgDR-0002 |
| D-IDENTITY-02 | JWT role別tool権限 | Viewer read-only固定 | AgDR-0002 |
| D-IDENTITY-03 | 更新、削除、承認 | Cedar default deny | AgDR-0002 |
| D-IDENTITY-04 | native Authorization Code | IAM outbound | AgDR-0002 |
| D-IDENTITY-05 | JWT interceptor | 未接続 | AgDR-0002 |
| D-MCP-01 | MCP `2026-07-28` | `2025-11-25` | AgDR-0003 |

## 3. 解決すべきだった課題

### 3.1 認可候補制限と実行時認可を混同した

`allowedTools`とBFF allow-listはmodelへ見せる候補を絞れるが、Gateway `tools/call`の最終認可ではない。

Supported UIのViewer deleteがBFFまたはHarnessで止まるだけでは、Cedar DENYもTarget未到達も証明できなかった。

### 3.2 権限定義を二重化した

旧方式はBFF role-tool表とCedar policyの両方を認可判断に使った。

現在方式はBFFからrole別認可を撤去し、Gateway/Cedarを唯一の実行時正本にする。

### 3.3 AWS primitiveの存在をE2E保証と誤認した

Harness CUSTOM_JWT、native Gateway、Identity Authorization Code、Gateway CUSTOM_JWT、Cedarは個別に存在する。

しかし、Harness inbound利用者、OAuth `userIdentifier`、`sessionUri`、Browser callback、Harness resume、Gateway `OAuthUser`を一系列で結ぶ公開契約は確認できなかった。

### 3.4 推測を実装へ持ち込んだ

過去spikeでは、BFFからWorkload Identity tokenとResource OAuth tokenを先取りし、型にないcallback情報を推測した。

これはManaged HarnessとAgentCore Identityへ責務を委譲する目的に反する。

### 3.5 Gateway対応版とmanaged client対応版を混同した

GatewayがMCP revisionを正式対応していても、Managed Harness内蔵clientが受理するとは限らない。

2026 revisionの失敗はIAM、Cedar、Targetの失敗ではなく、protocol negotiationの失敗だった。

## 4. 検討した選択肢

| 選択肢 | 利点 | 欠点 | 判断 |
|---|---|---|---|
| native Authorization Code + CUSTOM_JWT Gateway | 最終要求に最も近い | callback、session、resumeの公開契約が閉じず、現行adapter実測も失敗 | 条件付き保留 |
| native IAM + read-only | managed loop、native Gateway、Cedar ENFORCEを現在成立させられる | 本人principalとrole別writeを失う | 採用 |
| native Client Credentials | Gateway JWT形状を維持できる可能性 | secret、credential provider、machine identityが増え、本人identityは得られない | 不採用 |
| inline bridge | 元JWTをGatewayへ提示できる | BFFがMCPとmanual loopを所有 | 禁止 |
| 動的`tools/list` bridge | BFF静的role表を減らせる | bridgeとmanual loopが残る | 禁止 |
| Custom Runtime + Strands | protocolを制御できる | Managed Harness不使用、自前loop | 禁止 |
| AWS修正まで全面停止 | 劣後機能を出さない | 安全なread-onlyも提供できない | 不採用 |

Chosen: **Managed Harness native IAMとViewer相当read-only**。

現在確認できるAWS契約だけでmanaged loopとGateway/Cedar境界を実証でき、最終方式への変更範囲を限定できるためである。

## 5. 採用した設計

### 5.1 全体構成

```text
Browser
  │ Cognito access token
  ▼
API Gateway Cognito authorizer
  ▼
BFF
  │ 同じBearerでInvokeHarnessを一回
  ▼
Managed Harness CUSTOM_JWT
  │ managed loop / Managed Memory
  │ native agentcore_gateway / awsIam
  ▼
Gateway AWS_IAM / MCP 2025-11-25
  │ Policy Engine ENFORCE
  ▼
Cedar exact IamEntity / Viewer八action
  ▼
業務Lambda
```

### 5.2 責務境界

| Component | 所有する責務 | 所有しない責務 |
|---|---|---|
| Browser | login、Bearer送信、raw textの逐次表示 | Gateway token、tool認可 |
| API Gateway | Cognito scope検証 | agent loop、Cedar判定 |
| BFF | actorId、Bearer Harness invoke、Memory API、raw text streaming | MCP、role表、tool loop、OAuth token先取り |
| Managed Harness | model、loop、Memory、native Gateway tool | WorkOps独自callback protocol |
| Gateway | MCP、Target routing、Policy Engine | UI認証状態 |
| Cedar | principal、action、resourceの強制 | model tool選択 |
| Lambda | permit後の業務処理 | Gateway以前の認可 |

### 5.3 認証と認可

- BrowserからHarnessまでは同じCognito access tokenを使う。
- HarnessからGatewayはexecution roleのSigV4を使う。
- IAM principalをCognito利用者の代理とは扱わない。
- Cedarはregionなしのexact STS assumed-role IDを使う。
- Viewer相当のread-only八toolだけをpermitする。
- 一致するpermitがないtoolはdefault denyにする。
- 詳細はAgDR-0002を正本とする。

### 5.4 MCP

- Gatewayは`2025-11-25`だけを広告する。
- 2026単独とdualは現行Managed Harnessでは採用しない。
- 詳細はAgDR-0003を正本とする。

### 5.5 観測

- Cedar個別判定はPolicy spanを正本とする。
- account/region設定とGateway固有trace deliveryを分離する。
- 詳細はAgDR-0004を正本とする。

### 5.6 Application契約

- Cognito login redirectはAuthProviderへ一本化する。
- BFFは安全な固定errorだけをUIへ返す。
- Managed Memoryの検証不能eventを表示しない。
- `list-requests`はselector必須の現在契約を維持する。
- 詳細はAgDR-0005を正本とする。

## 6. 設計が置き換わった経緯

| 段階 | 主な責務 | 結果 | 置換理由 |
|---|---|---|---|
| Custom Runtime | Runtime内Strands、MCP、Memory | JWT Gateway経路は成立 | Managed Harness必須、自前loop禁止 |
| Managed Harness + IAM + BFF allow-list | managed loop、IAM Gateway | UI疎通成功 | IAM principalと利用者claimを混同 |
| native Authorization Code spike | Harness、Identity、CUSTOM_JWT Gateway | adapter return URL不足で失敗 | 推測実装を禁止 |
| inline bridge | BFF MCP、pause、resume | 元JWTをGatewayへ提示 | manual loop禁止 |
| 動的`tools/list`案 | BFF bridgeを改善 | Cedar正本へ近付く | bridgeが残る |
| native IAM read-only | managed loop、Cedar ENFORCE | allow、deny、Target未到達、UIを実証 | 現在採用 |

## 7. 詰まったところと解決策

| 事象 | 実際の原因 | 解決または現在の扱い |
|---|---|---|
| Viewer deleteがGatewayへ届かない | BFF/Harness先行制限 | BFF role表を撤去し、Cedarを認可主体にした |
| Cedarが拒否を強制しない | Gateway接続modeがLOG_ONLY | 初回からENFORCE固定 |
| native OAuth失敗 | adapterがreturn URLを渡さない | 推測修正せずAgDR-0002の解除待ち |
| service-linked token失敗 | BFFへtoken取得責務を置いた | BFF token先取り禁止 |
| Cedar policy不一致 | STS assumed-role IDにregionを含めた | regionなしexact IDへ修正 |
| 別sandbox Policy 409 | serviceが別engine同名も拒否 | deployment key prefix |
| Cognito domain調査混乱 | account-scoped照会を全世界と誤認 | profile別照会とCreate成功を分離 |
| MCP 2026失敗 | managed client非対応 | 2025-11単独へ固定 |
| 2025-06を最小と誤認 | 2025-11未試行 | 2025-11を実測して訂正 |
| E2EでChatWidgetなし | Portalを起動 | Asset Catalogへ切替 |

## 8. 実行結果

### 8.1 現在の実AWS

| 項目 | 値 |
|---|---|
| region | `ap-northeast-1` |
| account、identifier、stack | 対象を明示して検証。実IDはrepositoryへ記録しない |
| Gateway | 対象sandboxのGateway、`READY` |
| authorizer | `AWS_IAM` |
| MCP | `2025-11-25` |
| Policy mode | `ENFORCE` |
| Harness | 対象sandboxのManaged Harness、`READY` |
| Harness tool | native `agentcore_gateway`一件、`awsIam` |
| User Pool、domain | 対象sandboxのresourceをcontrol planeで照合 |

### 8.2 allow

- runtime log：`Negotiated protocol version: 2025-11-25`。
- CloudWatch traceで経路を相関した。
- Initialize 200、`tools/list` 200、Cedar ALLOW、`tools/call` 200、Target OK。
- `list-asset-types` Lambdaへ到達し、UIへ0件の実結果を表示した。

### 8.3 deny

- 非Harness IAM principalの直接`delete-asset`はcode `-20001`、`Tool Execution Denied`。
- CloudWatch traceとAPI requestを相関した。
- DENY後のTarget Lambda eventは0件。
- Supported UIのdelete/updateは`PartiallyAuthorizeActions`で`denied_tools`になり、Target未到達。

### 8.4 cleanupと現在の検証方針

- E2E一時user、chat session、Playwright tab、local Viteはcleanup済み。
- 失敗sandboxとCustom Runtime spike resourceは削除済み。
- 成功sandboxは現在方式の実体として保持する。
- repositoryにはユーザー判断によりtest/specファイルを保持しない。
- 現在の確認はbuild、SDK最小API、実control plane、span、Lambda log、Playwright E2Eを使う。

## 9. 意図的に対応しなかった残課題

この節は索引であり、詳細を重複記載しない。

| ID | 項目 | 詳細正本 |
|---|---|---|
| D-IDENTITY-01 | 元利用者`sub`のCedar principal | AgDR-0002 |
| D-IDENTITY-02 | JWT role別tool権限 | AgDR-0002 |
| D-IDENTITY-03 | 更新、削除、承認 | AgDR-0002 |
| D-IDENTITY-04 | native Authorization Code | AgDR-0002 |
| D-IDENTITY-05 | JWT interceptor | AgDR-0002 |
| D-MCP-01 | MCP 2026 revision | AgDR-0003 |
| D-APP-01 | `list-requests`外部pagination | AgDR-0005 |

## 10. 結果として得た設計原則

### 10.1 Positive consequences

- Managed HarnessがloopとMemoryを所有する。
- BFFからMCPとmanual loopを撤去した。
- Gateway/Cedarを実行時認可の正本にした。
- read-only allow、write deny、Target未到達を実証した。
- AWS修正後の変更面を限定した。

### 10.2 Negative consequences

- principalは利用者本人ではない。
- 全利用者がViewer相当になる。
- 副作用toolを提供できない。
- JWT interceptorを使えない。
- MCP revisionを2025-11-25へ固定する。
- repositoryに自動test成果物を保持しない。

### 10.3 YAGNIとして行わないこと

- BFF MCP client、manual loop、role-tool認可。
- 独自callback、pause、resume、round protocol。
- Custom Runtime、Strands loop、Client Credentials fallback。
- 未公開event fieldの推測。
- 認可判断と無関係な全面server-derived化。

## 11. 再検証が必要になる条件

1. Managed Harness imageまたはAPI modelが変わる。
2. Identity callback、session、resume契約が変わる。
3. Gateway MCP対応版またはnegotiation規約が変わる。
4. authorizer、Cedar principal、Policy modeを変える。
5. BFFのHarness invokeまたはBrowser response stream契約を変える。
6. Cognito client、scope、domain、callbackを変える。
7. identifierまたは物理名生成規則を変える。
8. observability account設定またはGateway deliveryを変える。
9. 利用者が最終要求または縮退許容範囲を変える。

条件が成立しなければ、同じ公式検索、過去チャット監査、version試行、sandbox再作成を行わない。

## 12. 証拠と成果物

### 12.1 役割別AgDR

- `AgDR-0002-defer-user-delegation-and-role-writes.md`
- `AgDR-0003-pin-managed-harness-mcp-2025-11-25.md`
- `AgDR-0004-separate-account-and-gateway-observability.md`
- `AgDR-0005-fix-application-boundary-contracts.md`

### 12.2 調査正本

- `docs/research/agentcore/01-official-contracts-and-open-surfaces.md`
- `docs/research/agentcore/02-current-implementation-and-live-results.md`
- `docs/research/agentcore/03-ruled-out-options-and-failure-results.md`
- `docs/research/agentcore/04-verification-and-revalidation-runbook.md`
- `docs/research/agentcore/05-research-results-index.md`

### 12.3 実装正本

- `packages/shared-backend/amplify/bedrock-agentcore/constructs/harness.ts`
- `packages/shared-backend/amplify/bedrock-agentcore/constructs/tool-gateway.ts`
- `packages/shared-backend/amplify/bedrock-agentcore/policy/policy-statements.ts`
- `packages/shared-backend/amplify/bedrock-agentcore/tool-access.ts`
- `packages/shared-backend/amplify/function/agentcore-bff/handler.ts`
- `packages/shared-backend/amplify/function/agentcore-bff/harness-client.ts`

## 13. 役割別判断の正本境界

| AgDR | 唯一の正本にする内容 | 他AgDRに書かない内容 |
|---|---|---|
| 0001 | 全体要求、採用方式、責務境界、経緯、総合結果 | 個別解除条件の全文 |
| 0002 | identity、authorization、未実装機能、解除、移行、rollback | MCP互換性、observability設定 |
| 0003 | MCP version、managed client互換、upgrade/rollback | identity方式 |
| 0004 | Cedar証跡、Transaction Search、delivery、sampling | Cedar policyの業務権限設計 |
| 0005 | Frontend login、BFF error、Memory、`list-requests` | Gateway認証方式 |

## 14. 未実装項目と解除条件の所在

本人identityとrole別副作用toolの未実装理由、禁止回避策、解除条件、変更面、rollbackはAgDR-0002だけに記載する。

MCP 2026 revisionの解除条件はAgDR-0003だけに記載する。

`list-requests`の挙動を変えるユーザー判断はAgDR-0005だけに記載する。

## 15. 既存調査の再利用規則

新規調査前に、調査文書01の`F-*`、文書02の`M-*`、文書03の`V-*`を必ず検索する。

無効化条件が成立していないconfirmedまたはdisproved項目は再調査しない。

AWS仕様、managed image、SDK型、IaC、利用者要求の変更がある場合だけ、変わった範囲を差分調査する。

旧主張は削除せず、文書02でdisprovedまたはsupersededとして維持する。

「重要な事実が発覚した」と報告する場合は、既存ID、新旧根拠、誤りの種類、影響節、再発防止条件を同時に示す。
