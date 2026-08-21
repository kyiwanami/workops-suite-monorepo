---
id: AgDR-0003
title: Managed HarnessとGatewayのMCPを2025-11-25単独へ固定する
status: accepted
date: 2026-08-21
deciders:
  - WorkOps project owner
  - Codex
---

# Managed HarnessとGatewayのMCPを2025-11-25単独へ固定する

## 1. 目的

AgentCore Gatewayが正式対応するrevisionと、現行Managed Harness内蔵clientが実際に交渉できるrevisionを分ける。

Gatewayのサービス対応だけを根拠に`2026-07-28`へ上げ、認証、Cedar、Targetまで不要に疑うことを防ぐ。

現在は、Managed Harness自身のnegotiationからUI回答まで成功した最新の2025系revisionである`2025-11-25`だけを広告する。

2026 revision固有機能を使わないことを現在の劣後条件として明示する。

## 2. Context

- AWS公式Gateway対応版は`2026-07-28`、`2025-11-25`、`2025-06-18`、`2025-03-26`である。
- CloudFormation schemaとCDK `MCPProtocolVersion.of()`は任意文字列を受理し得るため、synth成功はサービス対応の証拠ではない。
- Gatewayが対応するrevisionと、Managed Harness内蔵clientが受理するrevisionは別の互換性境界である。
- `2026-07-28`はstateless revisionであり、legacy `initialize` eraとは通信規約が異なる。
- `2025-11-25`と`2025-06-18`は今回利用するSDKのlegacy negotiation対象である。
- task、URL-mode elicitationなど2025-11以降の追加機能は現在のWorkOps tool経路で使わない。

## 3. Options Considered

| Option | Pros | Cons |
|---|---|---|
| `2026-07-28`単独 | Gatewayの新しい正式revision | 現行Harnessが`Unsupported protocol version`で拒否 |
| `2025-06-18`と`2026-07-28`のdual | 新旧client互換を期待できる | 実測ではGatewayが2026を返し、現行Harnessは同じ理由で失敗 |
| `2025-06-18`単独 | 現行Harnessで成功実績 | 2025系のより新しい正式対応版を試さず下げることになる |
| `2025-11-25`単独 | 現行Harnessで成功し、2025系のより新しい正式対応版 | 2026固有機能を使えない |
| Client側をWorkOpsで置換 | revisionを制御できる | Managed Harness内蔵clientを使わず、native構成を壊す |

## 4. Decision

Chosen: **`2025-11-25`単独**。

理由は、Managed Harness自身のruntime logでnegotiation成功を確認し、Gateway Initialize、`tools/list`、Cedar、`tools/call`、Target、UIまで一系列で成功した最も新しい2025系正式対応版だからである。

`2025-06-18`を最小downgradeとして採用した過去の判断は、`2025-11-25`を試していなかったため撤回する。

## 5. revision別実測

| Gateway advertisement | Managed Harness結果 | 認証/Cedarの変更 | 判断 |
|---|---|---|---|
| `2026-07-28` | `Unsupported protocol version` | なし | 不採用 |
| `2025-06-18`, `2026-07-28` | 同じ失敗 | なし | dualを互換策にしない |
| `2025-06-18` | read-only E2E成功 | なし | rollback可能だが現在不採用 |
| `2025-11-25` | read-only E2E成功 | なし | 現在採用 |

この比較で変更したのはGatewayのsupportedVersionsだけである。

Harness tool、outbound IAM、Gateway authorizer、Policy Engine、Cedar、Target、BFF、Frontendは維持した。

したがって、失敗と成功の差はMCP negotiationへ限定できる。

## 6. `2026-07-28`失敗の証拠

### 単独advertisement

- Browser login、BFF Bearer中継、Harness execution role credential取得、Gateway接続までは進んだ。
- Gatewayは`2026-07-28`を応答した。
- Managed Harness内蔵clientは`Unsupported protocol version`として拒否した。
- UIは安全な失敗文を表示した。
- この時点でCedar評価、Target実行へ進んでいない。

### dual advertisement

- Gateway control planeで`[2025-06-18, 2026-07-28]`を確認した。
- deployは成功した。
- Managed Harnessは再び2026 revisionを受け取り、同じ理由で失敗した。
- dual設定がclientごとに必ず互換versionを選ばせるという仮定は反証された。

### 失敗証跡

- 初回失敗動画：VP8、1440x900、25fps、100.72秒、2,052,384 bytes。
- SHA-256：`49FB86B39B7AA4BD055321F1A388C99F5A3A9D1251E494C5C7BAD64551F03F4A`。
- dual失敗動画：VP8、1440x900、25fps、34.48秒、969,090 bytes。
- SHA-256：`07A0FDF9E325A1153B8A62FEF7BA8182B204159838FBEF4E0408B1EE6FB36FDF`。
- これらは有効な失敗証拠であり、最終合格証拠ではない。

## 7. `2025-06-18`成功と限界

- Gatewayを2025-06単独へ戻した後、control planeは`READY`、AWS_IAM、ENFORCEを示した。
- Supported UIから`list-asset-types`が成功した。
- delete/updateはCedar `denied_tools`となり、Targetへ到達しなかった。
- 合格動画はVP8、1440x900、25fps、157.96秒、3,436,257 bytes。
- SHA-256：`B7996E9AC1C1CFE90957E892B67FE9EC7B0910D82D71184F4EA2D6418FD70125`。

ただし、2025-11を試さず2025-06を必要最小版とした判断は調査不足だった。

## 8. `2025-11-25`成功の証拠

- ローカルMCP SDK 2.0.0は`2025-11-25`をsupported versionとし、2025系の第一候補にしている。
- 検証scriptは`versionNegotiation.mode=legacy`を使う。
- SigV4 SDK最小確認で`initialize`と`tools/list`が成功した。
- 同じ検証sandboxへdeployし、root stackは`UPDATE_COMPLETE`になった。
- 同じGateway IDを維持し、別sandboxと別Cognito domainは作っていない。
- Gateway control planeは`READY`、`supportedVersions=[2025-11-25]`、AWS_IAM、ENFORCEを示した。
- Managed Harness runtime logは`Negotiated protocol version: 2025-11-25`を記録した。
- 要求時刻のeventは新runtime logだけに存在した。
- CloudWatch traceでInitialize 200、`tools/list` 200、Cedar ALLOW、`tools/call` 200、Target OKを確認した。
- `list-asset-types` Lambdaは`2026-08-21T01:05:44.512Z`に到達した。
- UIは0件の正常回答を表示した。
- PNGは73,615 bytes、SHA-256は`A7E9A32FEEBA35A0FEE3B1983B517C1F9DCF155473C4B6A42E9BB75B4E11DF67`である。

## 9. 実装契約

- `gatewayMcpProtocolVersions`は`["2025-11-25"]`とする。
- Gateway L2へこの配列をそのまま渡す。
- 検証scriptは同じrevisionを使う。
- product codeでtask、elicitation、2026 stateless discoveryへ分岐しない。
- MCP revision変更をauthentication、Cedar、Target変更と同じdeployへ混ぜない。

## 10. 2026 revisionを意図的に実装しない理由

- Gateway対応だけではManaged Harness互換を証明できない。
- dual advertisementの実測が失敗している。
- Managed Harness内蔵clientをWorkOpsで差し替えることはnative構成に反する。
- 現在使うtool callに2026 revision固有機能は必要ない。
- 2025-11で最終認可境界とUI機能を満たせる。

## 11. 解除条件

2026 revisionは次をすべて満たした場合だけ採用する。

1. AWS Gatewayが引き続き正式対応している。
2. Managed Harnessのrelease note、API、managed imageのいずれかが対応を示す、または最小実測で内蔵clientが成功する。
3. runtime logに期待revisionが記録される。
4. 2026固有のdiscoveryまたは該当protocol開始処理が成功する。
5. `tools/list`が成功する。
6. read-only `tools/call`が成功する。
7. Cedar ALLOWとTarget到達を確認する。
8. 非許可toolのDENYとTarget未到達を確認する。
9. Supported UIが正常回答する。
10. Gateway revision以外のidentity、Cedar、Target、BFFを同時変更しない。
11. dual advertisementを成功条件にせず、実際にHarnessが選んだrevisionをlogで確認する。

## 12. revision切替手順

1. `F-MCP-*` Claimの適用範囲と無効化条件を確認する。
2. AWS公式対応版一覧の変更差分だけを確認する。
3. SDK/API最小確認を行う。
4. 現sandboxとは別のresourceを作らずにGateway updateで検証可能か判断する。
5. 必要な場合だけ隔離identifierを使う。
6. supportedVersionsだけを変更する。
7. control planeで反映を確認する。
8. Managed Harness runtime logで選択revisionを確認する。
9. read allow、write deny、Target到達/未到達、UIを確認する。
10. 失敗時は直ちにrollbackする。

## 13. rollback

- supportedVersionsの完全な配列から2026 revisionを除く。
- `2025-11-25`単独へ戻す。
- Gateway control planeが`READY`になるまで待つ。
- Managed Harness runtime logで2025-11 negotiationを確認する。
- 認証、Cedar、Target、Harness、BFFへ互換wrapperを追加しない。

## 14. Consequences

- 現行Managed Harnessのnative Gateway経路を安定して使える。
- 2025-06へ不必要に下げない。
- 2026 revision固有機能を現在利用できない。
- version問題をidentityやCedar問題と分離できる。
- AWS修正時はGateway配列の小さい変更から再検証できる。

## 15. Verification

- `gatewayMcpProtocolVersions`の現在値をソースで確認した。
- backend buildが成功した。
- 2025-11のSDK最小確認が成功した。
- 実Gateway、runtime log、trace、Lambda log、UIを確認した。
- E2E一時user、chat session、tab、Viteをcleanupした。
- repositoryには現在test/specファイルを保持しない。

## 16. Artifacts

- `docs/research/agentcore/01-official-contracts-and-open-surfaces.md`
- `docs/research/agentcore/02-current-implementation-and-live-results.md`
- `docs/research/agentcore/03-ruled-out-options-and-failure-results.md`
- `docs/research/agentcore/04-verification-and-revalidation-runbook.md`
- `packages/shared-backend/amplify/bedrock-agentcore/tool-access.ts`
- `packages/shared-backend/amplify/bedrock-agentcore/constructs/tool-gateway.ts`
- `scripts/agentcore-gateway-iam-spike.mjs`
