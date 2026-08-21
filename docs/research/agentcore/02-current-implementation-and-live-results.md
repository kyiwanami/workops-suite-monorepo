# Managed Harness native構成の現在実装と実行結果

確認日：2026-08-21。

## 1. 目的

本書は、現在採用しているManaged Harness native構成について、local source、実AWS、E2E、observability、build、cleanupの確認結果を一つにまとめる。

ここに記載する値は、明示したaccount、region、profile、identifier、resource、時刻にだけ適用する。

AWSサービス全体または別sandboxへ一般化しない。

## 2. 現在の結論

現在成立している経路は次である。

```text
Browser
  -> Cognito Managed Login
  -> Cognito access token
  -> API/BFF thin Bearer relay
  -> Managed Harness CUSTOM_JWT inbound
  -> Managed Harness native agentcore_gateway
  -> AWS_IAM outbound
  -> Gateway AWS_IAM
  -> Cedar ENFORCE
  -> read-only business Lambda
```

成立している要求：

- loginはCognito一回だけである。
- ユーザーへ追加loginを依頼しない。
- agent loopはManaged Harnessが所有する。
- BFFはmanual pause、MCP、toolResult resume、round loopを所有しない。
- Gateway/Cedarがtarget実行前に最終認可を行う。
- MCP `2025-11-25`をManaged Harness自身が交渉する。
- read-only八toolは実行できる。
- 非許可principalとwrite toolはdefault denyになる。

現在成立していない要求：

- 元利用者`sub`をGateway/Cedar principalとして維持すること。
- JWT role claimによるViewer、Editor、Manager、Global Adminの認可。
- role別write、delete、approve。
- Managed Harness native Authorization Code callbackとresume。
- MCP `2026-07-28`。

未成立項目をIAM fallbackの成功へ繰り上げない。

## 3. local sourceの結果

### F-LOCAL-001 BFFはthin Harness relayである

| 項目 | 結果 |
|---|---|
| status | `confirmed` |
| source | `packages/shared-backend/amplify/function/agentcore-bff/handler.ts`、`harness-client.ts` |
| inbound | API Gateway Cognito authorizerが検証したBearerと`sub` |
| Harness auth | `HttpBearerAuthSigner`で同じBearerを付与 |
| invoke | `InvokeHarness`一回 |
| response | text deltaを`text/plain; charset=utf-8`で受信順に逐次中継し、`end_turn`だけを正常完了とする |
| error | 開始前はsafe JSON error、開始後は本文へerrorを混ぜずstreamを異常終了する |

BFFに存在しない責務：

- Gateway URL。
- MCP client。
- `tools/list`。
- `tools/call`。
- role別`allowedTools`。
- toolUse回収。
- toolResult再投入。
- manual pause/resume。
- maximum round loop。
- `GetWorkloadAccessTokenForJWT`。
- `GetResourceOauth2Token`。
- `CompleteResourceTokenAuth`。

### F-LOCAL-002 Managed Harnessはnative Gateway一件を所有する

| 項目 | 結果 |
|---|---|
| status | `confirmed` |
| source | `packages/shared-backend/amplify/bedrock-agentcore/constructs/harness.ts` |
| inbound | Cognito CUSTOM_JWT、allowed client、allowed scope |
| tool | type `agentcore_gateway`、name `workops_tools` |
| outbound | `awsIam` |
| allowedTools | `[*]` |
| Memory | managed Memory configuration |
| agent loop | Managed Harness所有 |

inline function、remote MCP raw Authorization、WorkOps manual loopは存在しない。

### F-LOCAL-003 GatewayはAWS_IAM、MCP 2025-11、ENFORCEである

| 項目 | 結果 |
|---|---|
| status | `confirmed` |
| source | `constructs/tool-gateway.ts`、`tool-access.ts`、`policy-statements.ts` |
| authorizer | `GatewayAuthorizer.usingAwsIam()` |
| protocol | `gatewayMcpProtocolVersions = ["2025-11-25"]` |
| policy mode | `ENFORCE` |
| traces | `TRACES` source、`XRAY` destination |
| request interceptor | 関連付けなし |

### F-LOCAL-004 Cedarはexact Harness IAM principalへViewer八件だけをpermitする

| 項目 | 結果 |
|---|---|
| status | `confirmed` |
| source | `policy/policy-statements.ts`、`backend.ts`、`tool-access.ts` |
| principal type | `AgentCore::IamEntity` |
| principal | regionなしSTS assumed-role ID |
| action | `${toolName}___${toolName}` |
| resource | exact Gateway ARN |
| permit input | `allowedToolNames`のread-only八toolだけ |
| policy count | 八件 |
| write | permitなし、default deny |

### F-LOCAL-005 現在許可するtoolだけを宣言する

`tool-access.ts`は、現在のCedar Policyで許可するread-only八toolを`allowedToolNames`へ宣言する。

未実装のrole別write権限や将来用のtool集合は保持しない。

### F-LOCAL-006 FrontendとMemoryの境界

- login redirect ownerは共通`AuthProvider`だけである。
- 認証前のpathはAmplifyの`customState`へ渡し、Auth Hubで復元する。
- Amplify Auth Hubのtoken更新失敗は共通`AuthProvider`が固定の認証失敗画面へ反映する。
- chat、session、message hookは自身でredirectを開始しない。
- callbackはcurrent originを使い、固定5173へ依存しない。
- MemoryはHarness message DTOだけを表示する。
- plain text、malformed JSON、内部tool payloadをfallback表示しない。

### F-LOCAL-008 Portal App URLのCognito動的登録は未接続である

| 項目 | 結果 |
|---|---|
| status | `not implemented` |
| intended owner | PortalのApp create/update |
| source value | Appモデルの`urlDomain` |
| intended trigger | App table DynamoDB Streamの`INSERT`/`MODIFY` |
| intended target | Cognito User Pool Client callback/logout URLへの追記 |
| current handler | CloudFormation `CustomResource` event形式 |
| current App event source | なし |
| current backend registration | なし |
| delete behavior | URLを削除しない |

`register-callback-url`というLambda sourceとPortalの`urlDomain`入力が存在することだけを、動的登録が動作している証拠にしない。
残課題の解除条件はAgDR-0005のD-APP-02を正本とする。

## 4. 検証対象AWS

### F-AWS-001 sandbox

| 項目 | 値 |
|---|---|
| region | `ap-northeast-1` |
| account/profile | 対象を明示して検証。実値はrepositoryへ記録しない |
| identifier/root stack | 既存sandbox。物理IDはrepositoryへ記録しない |
| current result | `UPDATE_COMPLETE` |
| disposition | 現在方式の検証実体として保持 |

### F-AWS-002 Cognito

| 項目 | 値 |
|---|---|
| User Pool、app client、domain | 対象sandboxのresourceをcontrol planeで照合。実IDはrepositoryへ記録しない |
| domain status | `ACTIVE` |
| 一時E2E user | 削除済み |
| 削除確認 | `UserNotFoundException` |

### F-AWS-003 Managed Harness

| 項目 | 値 |
|---|---|
| Harness | 対象sandboxのManaged Harness |
| status | `READY` |
| inbound | CUSTOM_JWT |
| tool | native `agentcore_gateway`一件 |
| outbound | `awsIam` |
| allowedTools | `[*]` |
| service default maxIterations | 75 |
| Memory | Managed Memory |
| runtime log | 現行runtimeだけに対象requestがあることを確認 |

service defaultの`maxIterations=75`はHarness内部制御であり、WorkOpsがmanual 75-round loopを所有する意味ではない。

### F-AWS-004 Gateway、Target、Policy

| 項目 | 値 |
|---|---|
| Gateway | 対象sandboxのGateway |
| status | `READY` |
| authorizer | `AWS_IAM` |
| supportedVersions | `[2025-11-25]` |
| Policy mode | `ENFORCE` |
| interceptor | なし |
| Target | 全19件`READY` |
| Policy Engine | 対象Gatewayへ関連付けたPolicy Engine |
| read-only Policy | 八件`ACTIVE` |
| Policy名prefix | deployment key付き。実値はrepositoryへ記録しない |

Targetは19件存在するが、permit PolicyはViewer read-only八件だけである。

TargetがREADYであることを、呼出し許可の証拠にしない。

### F-AWS-005 Cedar principal

八Policyは対象Harness execution roleのregionなしSTS assumed-role principalを使う。

session nameを含めない。

Gateway ARNとactionもactual resourceへexact一致する。

## 5. deployの結果

deployの時系列は、現在のresourceがどの修正を経て成立したかを説明するために残す。

### 5.1 第一回

- 対象identifierで作成を開始した。
- Cognito domainまでは作成できた。
- identifier非依存の`asset-kb-sandbox`が既存Knowledge Baseと衝突した。
- AgentCore resource作成前に停止した。
- 認証方式の失敗ではなく、physical name分離の実装漏れと判定した。
- 失敗stackを削除した。

### 5.2 第二回

- Gateway、Harness、Targetの作成までは成功した。
- 八件目Policy `list_request_types`が409になった。
- CloudTrail上、新Policy Engineへの同名Createは一回だけで、最初から409だった。
- 別Policy Engineに同名Policyが一件だけ実在した。
- retry重複ではなく、Policy名のglobal衝突と判定した。
- CloudFormation resource schemaはnameをPolicy Engine内でuniqueと説明する一方、実APIは別engineの同名を409にしたため、AWS service側の挙動差として記録した。
- 失敗stackを削除した。

### 5.3 第三回

- Policy名をdeployment key付きprefixへ変更した。
- Cedar principalがregionなしであることをtemplateで確認した。
- 旧interceptorと固定sandbox名がtemplateにないことを確認した。
- root stackが`CREATE_COMPLETE`になった。
- 後続MCP `2025-11-25`変更は同じGateway IDを維持し、`UPDATE_COMPLETE`になった。

失敗stackをupdateで修復して成功扱いにしていない。

## 6. direct Gateway DENY

### F-E2E-001 非Harness principalのwrite deny

| 項目 | 値 |
|---|---|
| caller | 非Harness IAM principal |
| method | MCP `tools/call` |
| tool | `delete-asset___delete-asset` |
| response code | `-20001` |
| response | `Tool Execution Denied` |
| reason | `No policy applies to the request (denied by default)` |
| trace、request ID | CloudWatchとAPI Gatewayで相関確認。実値はrepositoryへ記録しない |
| Target Lambda | DENY開始後event 0件 |

この結果が証明するもの：

- AWS_IAM Gatewayへ接続できた。
- Cedar default denyが実行された。
- Gatewayがtarget実行前に停止した。

この結果が証明しないもの：

- Cognito利用者`sub`のdeny。
- Viewer JWT roleのdeny。
- Supported UIからwrite toolを呼べること。

## 7. Supported UI E2E

### F-E2E-002 read allow

| 項目 | 値 |
|---|---|
| UI | Asset Catalog ChatWidget |
| request | 資産種別一覧 |
| HTTP | chat POST 200 |
| answer | 登録されている資産種別はありません |
| runtime | `Negotiated protocol version: 2025-11-25` |
| trace | CloudWatchで対象requestを相関確認 |
| Gateway | Initialize 200、`tools/list` 200、`tools/call` 200 |
| Cedar | `list-asset-types` ALLOW |
| Lambda | `2026-08-21T01:05:44.512Z`、正常終了 |
| console error | 0件 |

確認できた経路：

```text
Browser
  -> BFF
  -> Managed Harness
  -> native agentcore_gateway
  -> Gateway
  -> Cedar ALLOW
  -> Lambda
  -> Harness final answer
  -> UI
```

### F-E2E-003 write公開範囲とdeny

- `delete-asset`と`update-asset`は`PartiallyAuthorizeActions.denied_tools`へ分類された。
- read-only八toolは`allowed_tools`へ分類された。
- 両write Target Lambdaは要求後event 0件だった。
- BFF静的role表による拒否ではない。
- tool非公開だけで`tools/call` DENYを代用せず、F-E2E-001のdirect DENYと組み合わせる。

現在のUI結果は、Cedarが利用者roleを評価したことを意味しない。

IAM principal向けPolicyがtool公開範囲を決めた結果である。

## 8. MCP revisionの実行結果

| revision | advertisement | Managed Harness結果 | 結論 |
|---|---|---|---|
| `2026-07-28` | 単独 | negotiation失敗 | 現在不採用 |
| `2026-07-28` + legacy | dual | 2026を選び失敗 | automatic fallbackではない |
| `2025-06-18` | 単独 | E2E成功 | 互換はあるが最新成功版ではない |
| `2025-11-25` | 単独 | SDK、Harness、Gateway、UI成功 | 現在採用 |

MCP revision以外の認証、Cedar、Targetを変えずに比較した。

Managed Harness自身のruntime logで次を確認した。

```text
Negotiated protocol version: 2025-11-25
```

## 9. E2E artifact

| 種別 | 結果 | 形式 | bytes | duration | SHA-256 |
|---|---|---|---:|---:|---|
| 初回失敗 | 画面条件を含む失敗証跡 | VP8 WebM、1440×900、25fps | 2,052,384 | 100.72秒 | `49FB86B39B7AA4BD055321F1A388C99F5A3A9D1251E494C5C7BAD64551F03F4A` |
| dual-version失敗 | MCP dual negotiation失敗 | VP8 WebM、1440×900、25fps | 969,090 | 34.48秒 | `07A0FDF9E325A1153B8A62FEF7BA8182B204159838FBEF4E0408B1EE6FB36FDF` |
| 2025-06合格 | read結果三件を目視 | VP8 WebM、1440×900、25fps | 3,436,257 | 157.96秒 | `B7996E9AC1C1CFE90957E892B67FE9EC7B0910D82D71184F4EA2D6418FD70125` |
| 2025-11合格 | 質問と実回答を目視 | PNG | 73,615 | 該当なし | `A7E9A32FEEBA35A0FEE3B1983B517C1F9DCF155473C4B6A42E9BB75B4E11DF67` |

失敗artifactを最終合格証拠として使わない。

2025-06成功を2025-11成功の代用にしない。

## 10. observability結果

### F-OBS-001 account/region

| 項目 | 値 |
|---|---|
| trace segment destination | `CloudWatchLogs` |
| status | `ACTIVE` |
| Transaction Search indexing | `1%` |
| log group | `aws/spans` |
| resource policy | X-Ray span書込用が存在 |

### Gateway

- `TRACES` delivery sourceが存在する。
- destination typeは`XRAY`である。
- 対象Gateway resource ARNへ関連付く。

### allow trace

- Initialize 200。
- `tools/list` 200。
- Cedar `list-asset-types` ALLOW。
- `tools/call` 200。
- Target CLIENT span。
- Lambda正常終了。

Gateway `APPLICATION_LOGS`は追加していない。

標準Policy spanをCedar判定の正本にする。

## 11. buildとtest artifactの結果

### F-BUILD-001 build

test/spec全削除後、次を実行した。

```powershell
npm run build --workspaces --if-present
```

成功したworkspace：

- Asset Catalog。
- Portal。
- Request Manager。
- Shared Backend。

既知のVite chunk size warningはあるがbuild errorではない。

### F-TEST-001 repositoryのtest artifact

ユーザー判断により、repository全体の`*.test.*`、`*.spec.*`、`test/`、`tests/`、`__tests__/`配下を削除した。

- 追跡済み削除：51件。
- 今回追加予定だった未追跡削除：1件。
- 合計：52件。
- 残存scan：0件。

過去のtest結果はhistorical evidenceであり、現在test fileが存在する証拠ではない。

新しいtest/spec fileを追加しない。

## 12. identifierとCognito domain

Amplify sandbox `--identifier`はbackend IDのnameへ使われる。

external providerを使う場合、Cognito domain prefixは次を順にSHA-512へ与えたhex先頭20桁である。

1. deployment type `sandbox`。
2. workspace package namespace `@workops-suite/shared-backend`。
3. sandbox identifier。

対象sandboxでは計算したprefixと作成済みresourceが一致した。

identifierを変えれば候補prefixは変わるが、全世界での未使用を事前証明するものではない。

Create成功を最終的な割当成功証拠にする。

### account境界の確認

`DescribeUserPoolDomain`はaccount-scopedであり、別accountに実在するdomainは対象accountから照会できない。

アクセス可能な他案件profileとaccountの一覧は本projectの技術判断に不要なため、repositoryへ記録しない。

## 13. cleanup結果

### F-CLEANUP-001 E2E

- E2E chat session：DELETE 200。
- 一時Cognito user：削除後`UserNotFoundException`。
- 自分が開いたBrowser tab：0件。
- local Vite：停止。
- credential：file、console、文書へ保存していない。
- 成功sandbox：現在の検証対象として保持。

### 失敗deploy

- 第一回失敗stack：削除済み。
- 第二回失敗stack：削除済み。
- 対応するHarness：非同期削除完了を確認。
- Cognito domain候補：残存なしを確認。
- 成功sandboxは削除していない。

### Custom Runtime spike

- Runtime：削除後`ResourceNotFoundException`。
- S3 object versionとdelete marker：0件。
- IAM inline policy：削除済み。
- IAM role：`NoSuchEntity`。
- local ZIP：hash記録後削除。

## 14. 未達結果

| Claim | 内容 | 現在status | 解除正本 |
|---|---|---|---|
| `U-IDENTITY-001` | 元利用者`sub`のGateway/Cedar principal | `deferred` | AgDR-0002 |
| `U-IDENTITY-002` | JWT role claimをCedar tagとして評価 | `deferred` | AgDR-0002 |
| `U-IDENTITY-003` | role別write allow | `deferred` | AgDR-0002 |
| `U-OAUTH-001` | Harness native Authorization Code callback | fixed imageで不成立 | AgDR-0002 |
| `U-OAUTH-002` | callback後のHarness resume | `unknown` | AgDR-0002 |
| `U-MCP-001` | Managed HarnessのMCP 2026互換 | current imageで`disproved` | AgDR-0003 |

これらを現在方式の成功によって`confirmed`へ昇格しない。

## 15. 無効化条件

本書のcurrent claimは、次のいずれかが変わった場合に該当箇所だけ再確認する。

- BFF、Harness、Gateway、Policy、Frontend、Memory source。
- account、region、profile、identifier。
- stackまたはresource physical ID。
- Managed Harness image/runtime。
- MCP supported revision。
- Gateway authorizerまたはPolicy mode。
- Cedar principal、action、resource、tool set。
- Cognito User Pool、client、domain。
- Transaction Searchまたはtrace delivery。
- ユーザーの認証、role、write tool要件。

別冊04のgateを使い、差分以外を再実行しない。
