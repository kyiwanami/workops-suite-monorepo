# WorkOps AgentCore現行構成

更新日：2026年8月21日

## 1. 目的

WorkOpsの最終要求は、一度のCognito loginで、利用者本人のidentityと業務roleを失わずにManaged Harnessから業務toolを呼び、GatewayのCedarを実行時認可の正本にすることである。

ただし、現行Managed Harnessの本人委任契約は、Authorization Codeの開始からcallback、session binding、Harness resume、Gateway invocationまで公開情報だけでは閉じていない。

現在は、Managed Harnessがagent loopを所有するnative構造を保ったまま、Harness execution roleをprincipalとするIAM read-only構成を運用地点にしている。

本人principalとrole別の更新、削除、承認は完成扱いにせず、AWS公式の契約が揃うまで提供しない。

設計判断の正本は[AgDR-0001](../agdr/AgDR-0001-adopt-managed-harness-native-architecture.md)、未実装機能と解除条件の正本は[AgDR-0002](../agdr/AgDR-0002-defer-user-delegation-and-role-writes.md)である。

## 2. 現在の構成

```text
Browser
  │ Cognito access token
  ▼
API Gateway Cognito authorizer
  ▼
BFF
  │ 同じBearerでInvokeHarnessを一回
  ▼
Managed Harness CUSTOM_JWT inbound
  │ managed agent loop
  │ Managed Memory
  │ native agentcore_gateway一件
  ▼
Gateway AWS_IAM / MCP 2025-11-25
  │ Policy Engine ENFORCE
  ▼
Cedar exact Harness role / Viewer相当read-only
  ▼
業務Lambda
```

BrowserからManaged Harnessまでは、同じCognito access tokenを中継する。

Managed HarnessからGatewayまでは、Harness execution roleのSigV4を使う。

このIAM principalはCognito利用者本人の代理ではないため、Cedarが利用者の`sub`やrole claimを評価したとは扱わない。

## 3. 責務境界

| Component | 所有する責務 | 所有しない責務 |
|---|---|---|
| Browser | Cognito login、Bearer送信、raw textの逐次表示 | Gateway token取得、tool認可 |
| API Gateway | Cognito scopeの検証 | agent loop、Cedar判定 |
| BFF | actorIdの構成、BearerによるHarness invoke、Memory API、raw text streaming | Gateway MCP client、role別tool表、pause、resume、tool result再投入、round loop |
| Managed Harness | model実行、agent loop、Managed Memory、native Gateway tool | WorkOps独自のcallback protocol |
| Gateway | MCP negotiation、Target routing、Policy Engine接続 | Browserのlogin状態管理 |
| Cedar | principal、action、resourceの実行時判定 | modelへ見せる候補の選択 |
| 業務Lambda | permit後の業務処理 | Gateway以前の認可 |

BFFはHarnessを一回invokeするthin relayであり、Harnessが停止したtool callを回収してGatewayへ送り直すbridgeではない。

`allowedTools`やUI非表示は候補制限として使えても、実行時認可の代わりにはならない。

最終的なallowまたはdenyは、`ENFORCE`のCedarがGateway境界で決める。

## 4. 現在提供する機能

現在のCedar policyは、exact Harness roleにViewer相当のread-only八actionだけをpermitする。

一致するpermitがない更新、削除、承認はdefault denyとなる。

実AWSでは、read要求についてCedar ALLOW、Target到達、UI回答まで確認した。

write要求については、Cedar DENYまたはGatewayの公開tool制限となり、Targetへ到達しないことを確認した。

ただし、この結果は利用者role別認可の達成を意味しない。

全利用者が現在はViewer相当であり、元利用者`sub`をCedar principalにする機能は意図的な未実装である。

## 5. 固定しているAWS契約

| 対象 | 現在の値 | 理由 |
|---|---|---|
| Harness inbound | `CUSTOM_JWT` | BrowserのCognito access tokenでHarnessを呼ぶ |
| Harness tool | native `agentcore_gateway`一件 | managed loopをHarnessに保持する |
| Harness outbound | `awsIam` | 現行の確認済みnative接続を使う |
| Gateway authorizer | `AWS_IAM` | Harness execution roleを検証する |
| Gateway MCP | `2025-11-25`単独 | 現行Managed HarnessからUIまで成功したrevision |
| Policy mode | `ENFORCE` | Cedarを実際の拒否主体にする |
| Cedar principal | exact Harness execution role | IAM read-onlyの権限範囲を固定する |

MCP versionの根拠と更新条件は[AgDR-0003](../agdr/AgDR-0003-pin-managed-harness-mcp-2025-11-25.md)に記録している。

観測設定とCedar証跡の読み方は[AgDR-0004](../agdr/AgDR-0004-separate-account-and-gateway-observability.md)に記録している。

Frontend、BFF、Memory、`list-requests`の境界は[AgDR-0005](../agdr/AgDR-0005-fix-application-boundary-contracts.md)に記録している。

## 6. 実装しない回避策

次の方式は、Managed Harnessへ責務を置く目的と両立しないため導入しない。

- BFFのGateway MCP client。
- BFFの`tools/list`または`tools/call`。
- BFFのrole別tool認可。
- BFFによるtool use回収、pause、resume、tool result再投入、最大round制御。
- BFFによるWorkload Identity tokenまたはResource OAuth tokenの先取り。
- 型や公式文書にないcallback、`sessionUri`、resume protocolの推測。
- Custom RuntimeまたはStrandsへのagent loop移設。
- Client Credentialsを利用者本人identityへ見せる変換。

## 7. 最終要求へ切り替える条件

本人委任へ切り替えるには、少なくとも次の条件がすべて必要である。

1. Managed Harness native `agentcore_gateway`が使うAuthorization Codeの開始契約が公開されている。
2. Browser callback、state、session binding、Harness resumeの公開契約が一系列で接続できる。
3. Browserでloginした利用者とGatewayの`OAuthUser` principalが同一人物であることを証明できる。
4. 既存Cognito login後に二度目のloginを要求しない。
5. Gatewayを`CUSTOM_JWT`へ変更し、Cedarが検証済み`sub`とrole claimを評価できる。
6. DENY時にTargetが実行されないことをPolicy spanとTarget logで確認できる。
7. BFF、Frontend、Managed Memory、native Gateway tool、Target Lambdaを全面的に作り直さず切り替えられる。

条件を満たした場合の変更箇所は、Harness outbound auth、Gateway authorizer、Cedar principalとrole policy、必要なIdentity resourceに限定する。

BFFのBearer invoke、Managed Harnessのloop、native Gateway tool、Frontendのraw text stream契約は維持する。

## 8. 証拠の所在

調査結果は、公式契約、実装と実AWS結果、失敗結果、再検証手順、索引に分けて管理する。

- [AWS公式契約と未公開surface](../research/agentcore/01-official-contracts-and-open-surfaces.md)
- [現在の実装と実AWS結果](../research/agentcore/02-current-implementation-and-live-results.md)
- [棄却案と失敗結果](../research/agentcore/03-ruled-out-options-and-failure-results.md)
- [検証と再検証の手順](../research/agentcore/04-verification-and-revalidation-runbook.md)
- [調査結果索引](../research/agentcore/05-research-results-index.md)

新たな調査は、索引で既存IDと無効化条件を確認した後、変化したAWS仕様、managed image、SDK型、IaCまたは利用者要求の範囲だけを対象にする。
