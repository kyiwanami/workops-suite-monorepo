---
id: AgDR-0004
title: AgentCore観測設定をaccount共通面とGateway固有面へ分離する
status: accepted
date: 2026-08-21
deciders:
  - WorkOps project owner
  - Codex
---

# AgentCore観測設定をaccount共通面とGateway固有面へ分離する

## 1. 目的

Cedarのallow/deny、GatewayのMCP operation、Target実行、Lambda到達を、AWS標準のtraceとPolicy spanで相関できるようにする。

同時に、account/regionで一度だけ設定する項目と、sandbox GatewayごとにIaCで作る項目を分ける。

## 2. Context

Cedarを`ENFORCE`にしても、Policy resourceの`ACTIVE`だけでは次を証明できない。

- Gatewayが実際にPolicy Engineへ接続していること。
- 対象requestがALLOWまたはDENYになったこと。
- DENY時にTargetへ到達しなかったこと。
- ALLOW時に対象Lambdaまで到達したこと。

AWS標準の観測面は複数の管理単位に分かれる。

| 管理単位 | 設定 | lifecycle |
|---|---|---|
| account/region | trace segment destination | sandboxと独立 |
| account/region | Transaction Search | sandboxと独立 |
| account/region | indexing sampling | sandboxと独立 |
| account/region | `aws/spans` resource policy | sandboxと独立 |
| Gateway | delivery source | Gatewayと同じ |
| Gateway | delivery destination | Gatewayと同じ |
| Gateway | delivery | Gatewayと同じ |
| request | Policy span、Gateway span、Target span | 実行ごと |

これらを一つのsandbox stackへ無理に入れると、削除と再作成でaccount共通設定を毎回所有することになる。

## 3. 要求

1. Cedar decisionをAWS標準fieldで確認できる。
2. request IDとtrace IDでGateway、Policy、Target、Lambdaを相関できる。
3. account共通設定をsandboxごとに重複作成しない。
4. Gateway固有設定はIaCで再現できる。
5. 通常検証のsampling costを低くする。
6. Gateway application logを独自追加して標準spanと二重管理しない。
7. CloudTrailをdata plane認可結果の代用にしない。

## 4. Options Considered

| Option | 内容 | 結果 |
|---|---|---|
| A | Gateway application logだけを使う | Cedar decisionの標準fieldが不足するため不採用 |
| B | account設定もsandbox stackへ入れる | lifecycleと所有者が合わないため不採用 |
| C | account設定を手動/API、Gateway deliveryをIaC | 採用 |
| D | 全requestを高率indexing | costと必要性が合わないため不採用 |
| E | CloudTrailだけを使う | control planeとdata planeを混同するため不採用 |

## 5. Decision

次をaccount/region単位で一度設定する。

- X-Ray trace segment destination=`CloudWatchLogs`。
- Transaction Search status=`ACTIVE`。
- Default indexing sampling=`1%`。
- X-Rayが`aws/spans`へ書き込むCloudWatch Logs resource policy。

次をGateway単位でIaC管理する。

- `TRACES` delivery source。
- `XRAY` destination。
- sourceとdestinationを結ぶdelivery。
- 対象Gateway ARN。

Cedar判定の正本はAWS生成Policy spanとする。

Gateway `APPLICATION_LOGS`は追加しない。

## 6. 管理境界

### 6.1 account/region

account共通設定のownerはsandbox stackではない。

設定時はprofile、account、regionを明示する。

同じaccount/regionに複数sandboxまたはGatewayがあっても、Transaction Searchとtrace segment destinationを重複設定しない。

### 6.2 Gateway

Gateway trace deliveryは対象Gatewayのresource IDとlifecycleへ結び付く。

Gatewayを削除した場合、delivery source、destination、deliveryも削除する。

次回Gateway作成時にIaCから再作成する。

### 6.3 request

requestごとの証拠はresource定義ではなく実行結果である。

別冊02へtrace ID、request ID、timestamp、operation、decision、Lambda到達を記録する。

## 7. Policy span契約

最低限、次を保持する。

| field | 用途 |
|---|---|
| principal | 誰を評価したか |
| action | どのtool operationか |
| resource | どのGatewayか |
| authorization decision | ALLOW/DENY |
| allowed tools | listまたはpartial evaluationで公開されたtool |
| denied tools | 拒否されたtool |
| request ID | API requestの識別 |
| trace ID | Gateway、Policy、Target相関 |
| span ID | span単体の識別 |
| timestamp | runtime/Lambda logとの時間相関 |

AWS公式sampleのaccount、request ID、trace IDをWorkOps実行証拠として保存しない。

## 8. Gateway spanとTarget span

read allowでは次を相関する。

1. Harness runtime session時刻。
2. Gateway `Initialize`。
3. `tools/list`。
4. `PartiallyAuthorizeActions`。
5. `AuthorizeAction`。
6. `tools/call`。
7. Target CLIENT span。
8. Lambda log。

denyでは次を確認する。

1. Gatewayがrequestを受けた。
2. Cedar decisionがDENY。
3. `Tool Execution Denied`または相当応答。
4. 対象Target CLIENT spanがない。
5. 対象Lambda eventがない。

Policy spanがあることだけでENFORCEを証明しない。

Gateway control planeのmodeも読む。

## 9. CloudTrailの位置付け

CloudTrailは次に使う。

- Create/Update/Delete caller。
- API request ID。
- 409のrequest回数。
- 同名Policyの作成先。
- stack表面errorの原因分離。

CloudTrailだけで次を判定しない。

- Cedar ALLOW/DENY。
- `tools/list`公開範囲。
- Target実行前停止。
- Lambda到達。

## 10. 実行結果

### 10.1 historical account

2026-08-20、別の検証accountで次を確認した。

- CloudWatch Logs resource policy `TransactionSearchAccess`を作成した。
- trace segment destinationは`CloudWatchLogs`、statusは`ACTIVE`だった。
- Transaction Search Default indexingは`1.0%`だった。
- `aws/spans` log groupは保持30日、確認時`storedBytes=0`だった。
- Gatewayは`READY`、Policy modeは`ENFORCE`だった。
- tracing sourceとdestinationをIaCから作成した。

このaccountのresource IDとstored bytesを現在環境へ流用しない。

観測設計だけが現在も有効である。

### 10.2 current account

2026-08-21、対象profileとregionを明示して次を確認した。

| 項目 | 結果 |
|---|---|
| trace segment destination | `CloudWatchLogs` |
| status | `ACTIVE` |
| Transaction Search indexing | `1%` |
| log group | `aws/spans` |
| resource policy | X-Ray span書込用が存在 |
| Gateway | 対象sandboxのGateway |
| Gateway status | `READY` |
| Policy mode | `ENFORCE` |
| Gateway delivery | `TRACES`から`XRAY`が存在 |

allow traceで次を相関した。

- Initialize 200。
- `tools/list` 200。
- Cedar `list-asset-types` ALLOW。
- `tools/call` 200。
- Target CLIENT span。
- Lambda正常終了。

direct deny traceとAPI requestを相関し、default denyとTarget未到達を確認した。

## 11. sampling

通常設定は`1%`とする。

理由：

- account全体へ影響する。
- 常時100%はcostとvolumeを増やす。
- 代表E2Eはrequest時刻、trace ID、log groupを絞って検証できる。

短時間だけsamplingを上げる場合、次を事前に決める。

- 対象account/region。
- 開始時刻。
- 終了時刻。
- 元の率。
- 戻す担当。
- 取得したいrequest。

検証後に元の率へ戻す。

## 12. Consequences

### Positive

- Cedar decisionを標準spanで確認できる。
- Gateway、Policy、Target、Lambdaをtrace IDで相関できる。
- sandbox削除でaccount共通設定を失わない。
- Gateway deliveryはIaCで再現できる。
- 独自Gateway log schemaを保守しない。

### Negative

- account共通設定はsandbox deployだけでは完結しない。
- profile、account、regionを誤ると別環境を変更する。
- 1% samplingでは任意requestが必ずindexされるとは限らない。
- historical accountの証拠とcurrent accountの証拠を分けて管理する必要がある。

## 13. Verification

別冊04のV-08を正本とする。

最低限の合格条件：

1. account/region設定をread APIで確認する。
2. Gateway delivery source、destination、deliveryをread APIで確認する。
3. Policy Engine connection modeが`ENFORCE`。
4. allow requestでPolicy spanとTarget/Lambda到達を相関する。
5. deny requestでPolicy DENYとTarget/Lambda非到達を相関する。
6. CloudTrail結果をdata plane decisionの代用にしていない。

## 14. Revalidation Conditions

次が変わった場合だけ該当箇所を再確認する。

- accountまたはregion。
- Transaction Search API。
- X-Ray trace segment destination。
- `aws/spans` resource policy。
- Gateway IDまたはARN。
- delivery source/destination API。
- Policy span field。
- Gateway Policy Engine mode。
- sampling方針。

## 15. Artifacts

- `packages/shared-backend/amplify/bedrock-agentcore/constructs/tool-gateway.ts`
- `docs/research/agentcore/01-official-contracts-and-open-surfaces.md`
- `docs/research/agentcore/02-current-implementation-and-live-results.md`
- `docs/research/agentcore/04-verification-and-revalidation-runbook.md`
- `docs/research/agentcore/05-research-results-index.md`
