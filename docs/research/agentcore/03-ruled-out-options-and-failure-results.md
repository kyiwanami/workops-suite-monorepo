# AgentCoreで棄却した方式・失敗・負の調査結果

作成日：2026-08-21。

## 1. 目的

本書は、AgentCore構成で一度確認した失敗、誤った推論、適用範囲の狭い成功を、同じ条件で再利用または再調査しないための結果集である。

記載するのは文書整理の履歴ではない。

次の現在価値がある結果だけを残す。

1. どの仮定が誤りだったか。
2. どの方式を棄却したか。
3. 何が直接証拠で、何が一般化できないか。
4. どの条件が変われば差分調査できるか。
5. どの順序で失敗し、何によって原因を分離したか。

## 2. 結果の分類

| status | 意味 |
|---|---|
| `disproved` | 同じ条件で直接反証された |
| `incorrect inference` | 観測事実は正しいが、そこから導いた一般結論が誤った |
| `insufficient research` | 確認できた候補または証拠を見ずに結論した |
| `historical` | 特定image、account、commit、mode、時刻だけで成立した |
| `unknown` | 公開契約または実測がなく、存在・不存在を断定できない |
| `user-rejected` | ユーザーの明示制約に反するため不採用 |

## 3. 認可境界について確定した失敗

### M-001 `allowedTools`を最終認可とした

| 項目 | 結果 |
|---|---|
| status | `disproved` |
| 誤った仮定 | role別`allowedTools`でViewerにwrite toolを見せなければ、実行時認可も完成する |
| 確認結果 | `allowedTools`はLLMへ見せるtool候補を絞る。Gatewayへ到達した`tools/call`の最終認可ではない |
| 現在の扱い | Harnessはnative Gatewayを所有し、Gateway/Cedarをtarget前の最終境界にする |
| 再調査条件 | AWSが`allowedTools`をsecurity boundaryとして公式に再定義した場合だけ |

### M-002 先行拒否をCedar DENYと報告した

| 項目 | 結果 |
|---|---|
| status | `incorrect inference` |
| 観測 | Viewerの`delete-asset`要求が実行されなかった |
| 実際の拒否主体 | Frontend、BFF、Harnessのtool公開またはrole allow-list |
| 証明できなかったもの | Cedar DENY、Gatewayによるtarget前停止、deny時のLambda未到達 |
| 現在の扱い | direct Gateway DENYとSupported UIの公開範囲を別の証拠として扱う |
| 再調査条件 | Supported UIがwrite toolを実際にGatewayへ送れる構成になった場合 |

### M-003 Policy `ACTIVE`とGateway `ENFORCE`を混同した

| 項目 | 結果 |
|---|---|
| status | `disproved` |
| 観測 | Policy単体は`ACTIVE`だったが、当時のGateway connection modeは`LOG_ONLY`だった |
| 結論 | Policyの存在、評価span、`ACTIVE`だけでは拒否強制を証明できない |
| 現在の扱い | Gatewayを初回作成から`ENFORCE`にし、control planeとdeny実行の両方を確認する |
| 再調査条件 | Policy Engine state modelまたはGateway接続APIが変わった場合 |

### M-004 IAM principalを利用者identityと混同した

| 項目 | 結果 |
|---|---|
| status | `incorrect inference` |
| 誤った仮定 | BFF→HarnessをSigV4にすれば、元のCognito利用者identityが下流Gatewayへ伝わる |
| 確認結果 | AWS_IAM outboundでCedarに見えるのはHarnessのassumed-role identityであり、元利用者`sub`ではない |
| 過去inline成功の理由 | BFFが保持した元JWTをBFF自身がCUSTOM_JWT Gatewayへ渡していたため |
| 現在の扱い | IAM fallbackの縮退を明示し、本人委任の未実装と分ける |
| 再調査条件 | AWSがuser-bound delegation contractを追加した場合 |

## 4. Managed Harness native OAuthについて確定した失敗

### M-005 特定imageの失敗をnative Gateway全体へ一般化した

| 項目 | 結果 |
|---|---|
| status | `incorrect inference` |
| 直接証拠 | v5/v6の特定imageでAuthorization Code adapterがreturn URLとauthorization URL callbackを接続しなかった |
| 誤った一般化 | Managed Harness native `agentcore_gateway`は現在も将来も使えない |
| 現在の結論 | image digestとfile hashが同じ範囲では再利用できるが、native Gateway一般の不可能性には使えない |
| 再調査条件 | manifest/config digestまたは対象file hashが変わり、該当箇所に修正差分がある場合 |

### M-006 CognitoのRFC 8693非対応から追加login必須と断定した

| 項目 | 結果 |
|---|---|
| status | `incorrect inference` |
| 確認結果 | Cognito token endpointがRFC 8693 token exchange grantを提供しないことと、JWT forward、managed delegation、IAM fallbackの可否は別問題である |
| 禁止する結論 | 「TOKEN_EXCHANGEがないため二度目のloginしかない」 |
| 現在の扱い | 追加loginを絶対に要求しない。現在はIAM fallbackを使う |
| 再調査条件 | Cognito対応grantまたはAgentCoreのCognito専用delegation契約が変わった場合 |

### M-007 BFFがservice-linked tokenを先取りした

| 項目 | 結果 |
|---|---|
| status | `disproved` |
| 実装した呼出し | `GetWorkloadAccessTokenForJWT`、`GetResourceOauth2Token` |
| 実行結果 | Directoryと個別workload権限を追加してもservice-linked identity callerで`AccessDenied` |
| 根本原因 | IAM action不足だけでなく、Managed workloadのIdentity token取得主体を外部BFFにした責務違反 |
| 現在の扱い | BFFからtoken取得、OAuth開始、provider secret処理を除去 |
| 再調査条件 | AWSが外部BFFをcallerとする公式契約を公開した場合 |

### M-008 authorization URL、callback、session、resumeを推測した

| 項目 | 結果 |
|---|---|
| status | `insufficient research` |
| 誤った実装 | 未確認の`authorizationUrl` event、`sessionUri` query、callback body、同じquery再送をFrontend/BFF契約にした |
| 確認結果 | SDK `3.1112.0`の公開`InvokeHarness` request/stream型に一体契約を確認できない |
| 限定 | 専用fieldが見つからないことは、metadataや別APIを含む機能不存在の証明ではない |
| 現在の扱い | 推測fieldを実装しない。公式surfaceが揃うまでIAM fallbackを維持する |
| 再調査条件 | SDK型、Harness API、managed imageの該当契約が変わった場合 |

## 5. 検証対象を誤った失敗

### M-009 dirty spikeをclean baselineとして扱った

| 項目 | 結果 |
|---|---|
| status | `disproved` |
| dirty対象 | `C:\git\worktrees\agentcore-native-oauth-spike` |
| 問題 | BFF token先取り、Gateway target二件、過剰IAMを含む八ファイル差分があった |
| 分離対象 | `C:\git\worktrees\codex-agentcore-native-oauth-spike-v2` |
| 正本commit | `9546e67532a42e62f144a18895d92cd359cb307e` |
| 正本tree | `c0c7e165c7072ab0a2398de94ee8f0f6a1084597` |
| dirty HEAD | `d211a675a4e0443369b913fde35d49ec2ff06b70` |
| 正本の第一親 | `3110d2cc` |
| 結論 | worktree、HEAD、tree、dirty statusを固定せずに合否を継承しない |

## 6. 手動bridgeへ戻った失敗

### M-010 inline bridgeをAWS標準構成と呼んだ

| 項目 | 結果 |
|---|---|
| status | `user-rejected` |
| 構成 | Harnessがtool callで停止し、BFFがGateway MCP実行、`toolResult`再投入、resume、round loopを所有する |
| 確認結果 | Harness inline functionはclient-side tool実行契約であり、Harness VM内でGatewayを完結させるmanaged toolではない |
| 現在の結論 | 動作しても最終要件を満たさない。採用候補へ戻さない |
| 再調査条件 | AWSがHarness内部実行の別managed toolを公開し、manual loopが不要になった場合 |

### M-011 動的`tools/list` bridgeを最終解にした

| 項目 | 結果 |
|---|---|
| status | `user-rejected` |
| 利点 | BFFの静的role-tool表をやめ、Gateway/Cedarの公開結果を`allowedTools`へ反映できる |
| 残る問題 | BFFがMCP client、tool loop、pause/resume、toolResult変換を所有する |
| 現在の結論 | 旧inline bridgeの改善であり、managed-native標準構成ではない |
| 再調査条件 | ユーザーがmanual loop禁止を変更した場合だけ |

### M-012 Custom RuntimeとStrandsを最終候補へ戻した

| 項目 | 結果 |
|---|---|
| status | `user-rejected` |
| 技術的事実 | Custom Runtime内ならStrands、MCP client、Memory、turn loopを完結できる |
| 残る責務 | CORS/preflight、Browser event DTO、履歴一覧、message正規化、stream変換をapplicationが所有する |
| 現在の結論 | Managed Harnessを使うという明示要件に反するため不採用 |
| 再調査条件 | ユーザーがManaged Harness必須条件を変更した場合だけ |

### M-013 ECR/container運用をCustom Runtime棄却の主要根拠にした

| 項目 | 結果 |
|---|---|
| status | `incorrect inference` |
| 確認結果 | 最終Runtime artifactはECR必須ではなくNode 22 code assetだった |
| 結論 | Custom Runtime不採用の根拠は運用artifactではなく、Managed Harness必須とapplication責務増加である |
| 再調査条件 | 不要。棄却理由の訂正として固定する |

## 7. MCP互換性の調査不足

### M-014 2025-11-25を試さず2025-06を最小とした

| 項目 | 結果 |
|---|---|
| status | `insufficient research` |
| 時系列 | 2026単独失敗、dual失敗、2025-06成功の後、2025-11未試行を見落とした |
| 追加確認 | 2025-11単独でSDK、Managed Harness negotiation、Gateway、Cedar、Target、UIが成功 |
| 結論 | 現在は2025-11単独を採用する |
| 再調査条件 | Managed Harness imageまたはGateway対応revisionが変わった場合 |

### M-015 dual advertisementを互換策と推測した

| 項目 | 結果 |
|---|---|
| status | `disproved` |
| 実行結果 | Gatewayが2026とlegacyを広告してもManaged Harnessは2026を選び、互換成功しなかった |
| 結論 | dualは自動fallback保証ではない |
| 再調査条件 | managed clientのnegotiation実装が変わった場合 |

## 8. AWS resourceとdeployで犯した失敗

### M-016 Cognito domainの所在をaccount scopeなしで断定した

| 項目 | 結果 |
|---|---|
| status | `incorrect inference` |
| 問題 | 一profileの結果からdomainが存在しない、または占有されていると断定した |
| 正しい方法 | 利用可能profileごとにaccount、region、User Pool、domainを明示して検索し、最後にCreate結果で確定する |
| 限定 | profile走査はアクセス可能accountの証拠であり、全世界の予約状態ではない |

### M-017 identifierだけで全physical nameが分離すると仮定した

| 項目 | 結果 |
|---|---|
| status | `disproved` |
| 実行結果 | 一部resource名とPolicy名がidentifier/deploymentを含まず、別Policy Engineとの409を起こした |
| 結論 | synth templateで全physical name、domain prefix、Policy名を確認する |
| 現在の対策 | Policy名へdeployment keyを含める |

### M-018 初回作成契約の欠陥を失敗stackのupdateで直そうとした

| 項目 | 結果 |
|---|---|
| status | `incorrect inference` |
| 問題 | 最初から必要なPolicy modeやresource contractをupdateで後付けしようとした |
| 結論 | 初回作成条件が誤っている場合は失敗stackを削除し、修正後に新規作成する |
| 例外 | updateを使う場合は、resource維持が目的でreplacementがないことを確認する |

### M-019 Cedar principal ARNへregionを含めた

| 項目 | 結果 |
|---|---|
| status | `disproved` |
| 失敗 | STS assumed-role principalのentity表現をregion付きで生成した |
| 確認結果 | current Cedar principalはregionなしSTS assumed-role IDを使う |
| 対策 | control planeのactual principalとCedar textをexact比較する |

## 9. E2E実施条件を確認しなかった失敗

### M-020 ChatWidget所有appを確認せずPortalを起動した

| 項目 | 結果 |
|---|---|
| status | `incorrect inference` |
| 問題 | route ownershipをsourceで確認せず、PortalにChatWidgetがないことを機能欠落と疑った |
| 対策 | E2E前にapp、route、widget owner、portを固定する |

### M-021 viewportと既知localhost条件を再発させた

| 項目 | 結果 |
|---|---|
| status | `disproved` |
| 問題 | 過去E2Eで既知だった画面サイズ、localhost、認証済みsurfaceを事前checklistに反映しなかった |
| 対策 | viewportを不用意に変更せず、同じ認証済みBrowser surfaceを使う。ユーザーへloginを依頼しない |

## 10. 調査を繰り返した失敗

### M-022 既存結果を検索せず同じ調査をした

| 項目 | 結果 |
|---|---|
| status | `confirmed` |
| 再実施したもの | Docker停止、同一Harness image layer、`TOKEN_EXCHANGE + Cognito`、`remote_mcp + raw Authorization` |
| 原因 | 既存証拠をprimitive名、error、digestで先に検索しなかった |
| 結論 | 別冊05のClaimと無効化条件を調査前に照合する |
| 禁止 | 同一digest、同一API shape、同一ユーザー制約のまま「念のため」再調査しない |

## 11. native OAuth失敗を一つにまとめない

### OAUTH-F01 service-linked Workload Identity caller

- BFFのtoken先取りで発生した。
- BFF IAM不足だけの問題ではない。
- managed identityの取得主体をBFFにした責務境界が誤りだった。

### OAUTH-F02 `ResourceOauth2ReturnUrl`欠落

- BFF prefetchを除去した後も、特定Harness imageのadapterがreturn URLをIdentity clientへ渡さず発生した。
- port、IAM、Cedar、Target、MCP revisionの問題ではない。
- 固定digestにだけ適用できるhistorical resultである。

### OAUTH-F03 authorization URL伝搬未確認

- `InvokeHarness`公開event unionに専用fieldを確認できなかった。
- fieldがないことを機能不存在の証明にしない。
- 推測fieldをFrontend契約にしない。

### OAUTH-F04 callback後のHarness resume未確認

- Identity一般APIはcallback完了primitiveを公開する。
- 中断したHarness invocationをどのAPI、event、sessionで再開するかは確認できなかった。
- callback処理単体の成功をHarness E2E成功にしない。

## 12. 調査・実験の時系列結果

### 12.1 native OAuth

1. BFFがWorkload/Resource OAuth tokenを先取りする案を実装した。
2. service-linked identity callerで`AccessDenied`になった。
3. token取得主体をHarness/Runtime内部へ戻し、BFF prefetchを除去した。
4. v5/v6で`ResourceOauth2ReturnUrl`欠落の`ValidationException`を再現した。
5. default return URL、allowed URL、port、IAM、call-level overrideでは解消しなかった。
6. image sourceを固定し、adapterが`callback_url`と`on_auth_url`を接続していないことを確認した。
7. SDK公開型にauthorization URL、session URI、resumeの一体契約がないことを確認した。
8. 「native全体が不可能」ではなく、「本人委任を確証付きで実装できるsurfaceが不足」と結論した。
9. AWS修正後に変更面を限定できるIAM fallbackを採用した。

### 12.2 MCP revision

1. Gatewayを`2026-07-28`単独で作成した。
2. Managed Harnessがrevisionを拒否した。
3. 認証、Cedar、Targetを変えずdual advertisementへ更新した。
4. Managed Harnessは再び2026を選び、失敗した。
5. `2025-06-18`単独へ戻し、read allowとwrite denyを確認した。
6. `2025-11-25`未試行を検出した。
7. 2025-11単独へ更新し、SDK最小確認に成功した。
8. Managed Harness runtime logで`Negotiated protocol version: 2025-11-25`を確認した。
9. Gateway、Cedar、Target、UIまで成功した。

### 12.3 sandbox deploy

1. 第一回はidentifier非依存名を検出し、失敗stackを削除した。
2. 第二回は八件目Policy `list_request_types`が409になった。
3. CloudTrailで新engineへの同名Createは一回だけと確認した。
4. 別Policy Engineの同名Policyが実在すると確認した。
5. 第二回失敗stackを削除した。
6. 第三回はdeployment key付き八Policy、regionなしprincipal、旧interceptor不存在をsynthで確認した。
7. root stackが`CREATE_COMPLETE`になった。
8. 2025-11 updateが`UPDATE_COMPLETE`になった。

### 12.4 Custom Runtime隔離spike

- `CreateAgentRuntime`で`metadataConfiguration`を省略してもversion 1から`requireMMDSV2=true`だった。
- version 1とversion 2は`READY`、invoke HTTP 200だった。
- Strands TypeScript `1.13.0`はMCP `2025-11-25`を提示した。
- これはCustom Runtime client能力であり、Managed Harness能力の代用ではない。
- Runtime、S3 object version、IAM policy/role、local ZIPをcleanupした。

## 13. 固定artifact

### 13.1 Managed Harness image

| 対象 | manifest digest | config digest |
|---|---|---|
| OAuth adapter失敗を解析した旧image | `sha256:369be38556b45464a420bcf71b036cf4bed6b7127f27b0f34234202fac1c47d7` | `sha256:3627b52692dcc0926dba0ef3fa30e926a513b5004e6a3b472f58fbd44b0fa855` |
| 後日同tagを取得したimage | `sha256:ba9dc43ff37a8677a098c7a768643b6368a3e0c3b65c5b9b2e9d656fcd2c9551` | `sha256:1d1f1718bfbd5c3fa955ced3481dc37e7bd31829293b144d82ddf47a7ef0587e` |

| image内file | SHA-256 |
|---|---|
| `/opt/amazon/lib/python3.12/site-packages/loopy/tools/gateway.py` | `88d0342f40e149d38e591c08671b7c7ccbdaa186016b4aa9240b5362c33e208c` |
| `/opt/amazon/lib/python3.12/site-packages/bedrock_agentcore/services/identity.py` | `4df7e8d18585ad13655bb6793cafa0ec42ca4c984fcef2236ef769b63d988946` |

`loopy`本体は圧縮サイズ`871,169,781 bytes`の`/opt/amazon` COPY layerに含まれた。

`14,668,092 bytes` layerはOpenTelemetry追加、`14,213,716 bytes` layerは`ctr`追加だった。

同一digestとfile hashが揃っていたのに大容量layerを再取得しても証拠強度は増えなかったため、同条件では再取得しない。

### 13.2 Custom Runtime spike

| artifact | 値 |
|---|---|
| local ZIP SHA-256 | `7C272111F6F3499D4BA782A02BA4CA0D3C0F4D5E03CA9653FCA8EBCA98B551E5` |
| S3 object ETag | `39fe5dfd6925ad27460f53ab6c80133a` |
| AWS resource ID | 削除済み。実IDはrepositoryへ記録しない |

これらは削除済みspikeの同一性を示し、resourceの現存を意味しない。

### 13.3 旧inline allow-path

| artifact | 値 | 限定 |
|---|---|---|
| Lambda request | logで到達確認 | inline allow一件のtarget到達。Cedar DENY証拠ではない |
| duration | 約`448 ms` | SLOではない |

## 14. 過去調査の証拠索引

過去のCodex task IDはprojectの技術判断に不要な運用metadataなので、repositoryへ記録しない。

再調査時は別冊05のClaim、適用範囲、無効化条件を使う。

## 15. 再利用時の禁止事項

1. UIの先行拒否をCedar DENYと書かない。
2. inline allow成功をmanaged-native成功へ流用しない。
3. BFFの`AccessDenied`をHarness内部の現在失敗へ流用しない。
4. 固定digestのsource監査を、digest未照合の`latest`へ流用しない。
5. return URL設定をauthorization URL通知、callback、resume成功の証拠にしない。
6. SDK公開型の不在からサービス機能の不存在まで断定しない。
7. v5/v6の`ValidationException`を現行native OAuthの必然的失敗にしない。
8. Custom RuntimeのMCP成功をManaged HarnessのMCP成功にしない。
9. Policy `ACTIVE`をGateway `ENFORCE`の代用にしない。
10. 同一条件のWeb検索、image取得、SDK spike、AWS APIを繰り返さない。

## 16. IAMとapplicationの補助的な境界条件

AgentCore native構成の採否とは独立して、IAM resource、trust、Cognito scope、Frontend error処理には個別の境界条件がある。

各項目は、現在の実装状態と再確認条件を固定する。

### 16.1 IAM、trust、ARN

| ID | 確認事項 | 現在の判定 | 現在の扱い |
|---|---|---|---|
| `H-IAM-001` | Gateway Policy mode | 解消済み | sourceと実Gatewayは`ENFORCE`。`LOG_ONLY`では認可完成としない |
| `H-IAM-002` | 12個のtool Lambdaに生成されるAppSync `query`、`mutate`、`listen`の操作範囲 | 未判定、対象外 | Data/AppSync認可はAgentCore設計判断に含めず、ユーザーの明示指示なしに調査または変更しない |
| `H-IAM-003` | Harness execution roleのCloudWatch Logs resource | 解消済み | runtime log group ARN、log stream ARN、Describe用log group patternへstatementを分けている |
| `H-IAM-004` | Gateway roleのCedar action resource | 解消済み | `GetPolicyEngine`をPolicy Engine ARNへ分離し、Authorize系をPolicy EngineとGateway name patternへ限定している |
| `H-IAM-005` | Gateway trustの`SourceArn` | 制約あり | Gateway ARNが作成前に確定しないため`${gatewayName}-*`を使う。exact ARNを設定できる公式作成契約が出た場合だけ再検討する |
| `H-IAM-006` | Harness trustの`SourceArn` | 制約あり | `SourceAccount`とAgentCore service ARN patternを使う。作成前にexact Harness ARNを参照できる公式IaC契約が出た場合だけ狭める |
| `H-IAM-007` | Managed Memory ARN | 実経路で確認済み | `${harnessName}-*`へ限定した状態でManaged Memory E2Eが成功している。別Harness名へ一般化しない |
| `H-IAM-008` | Knowledge Base ARNのpartition | 未対応、対象外 | sourceに`arn:aws`固定値が残る。商用partition外へ展開する要求が出るまで変更しない |

`H-IAM-002`と`H-IAM-008`はAgentCore認証と認可の完成条件ではないため、作業範囲へ自動的に追加しない。

### 16.2 MCP、認証、UI

| ID | 確認事項 | 現在の判定 | 現在の扱い |
|---|---|---|---|
| `H-APP-001` | BFFのrole別tool再検証 | 不適用 | BFFはMCP、tool use、role別allow-listを所有しない。Gateway/Cedarが最終境界である |
| `H-APP-002` | Cognito custom scopeのtoken付与 | 現在のE2E経路で確認済み | Managed LoginからBFF、Harnessまで成功した。他clientまたは別auth flowへ一般化しない |
| `H-APP-003` | 401時のlogin redirect所有者 | 解消済み | login ownerを共通`AuthProvider`へ一本化している |
| `H-APP-004` | Managed Memoryの表示対象 | 解消済み | plain text fallbackを使わず、Harness message DTOだけを表示する |
| `H-APP-005` | ChatPanel周辺のReact Error Boundary | 未導入 | UI hardeningであり、AgentCore認証と認可の完成条件には含めない。導入にはユーザー判断が必要 |
| `H-APP-006` | inline resume時のassistant text | 不適用 | BFF manual tool loopは存在しない |
| `H-APP-007` | response開始後のerror分類 | 解消済み | errorをresponse bodyへ混ぜずstreamを異常終了する。Browserに異常終了が伝われば固定文へ置換し、正常EOFなら受信済みtextを保持する |
| `H-APP-008` | 直接Agent Runtime用IAM actionと環境変数 | 解消済み | sourceに`InvokeAgentRuntime`と`HARNESS_ENDPOINT_ARN`は存在しない |
| `H-APP-009` | API/BFFのCORS origin | 制約あり | `Access-Control-Allow-Origin: *`が残る。production origin制限を導入する場合はFrontend deployment contractとして判断する |

### 16.3 native構成で使う契約の範囲

次の契約はnative構成でも使用する。

- DEFAULT Harness endpointへ`harnessArn`だけを渡すこと。
- Cognito access tokenをBearerとしてHarnessへ伝播すること。

次の契約はBFFの責務に含めない。

- Gateway tool namingの境界変換。
- `CallToolResult`の`content`、`structuredContent`、`isError`処理。
- inline functionの複数tool useとresume loop。

DEFAULT Harness endpointとBearer伝播は現在のE2Eで確認済みである。

MCP result変換とinline resumeはBFFから撤去したため、現在構成の合格条件には使わない。

### 16.4 再確認条件

次の場合だけ該当IDを再確認する。

- Data/AppSync認可をユーザーが明示的に対象へ戻す。
- 商用`aws`以外のpartitionへ展開する。
- exact Gateway/Harness ARNを作成前にtrustへ設定できる公式IaC契約が追加される。
- Managed Memory ARN生成規則が変わる。
- React Error Boundaryを要件へ含める。
- stream開始後errorを認証回復へ接続する要件が追加される。
- production CORS origin制限を要件へ含める。
