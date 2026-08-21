# AgentCore公式契約と未確認surface

確認日：2026-08-21（Asia/Tokyo）。

## 1. 目的

本書は、WorkOpsがManaged Harness、AgentCore Gateway、AgentCore Identity、Cedar、observabilityを組み合わせる際に、AWS公式資料から直接確認できる契約と、確認できない接続surfaceを分ける。

対象はAWS公式Developer Guide、Data Plane API Reference、Control Plane API Reference、CloudFormation Reference、AWS SDK API Referenceである。

実AWSの値は別冊02、失敗と固定imageの結果は別冊03を正本とする。

## 2. 結論

個別のAWS primitiveは存在する。

- HarnessのCUSTOM_JWT inbound。
- Harnessのnative `agentcore_gateway`。
- AgentCore Identityを使うOAuth outbound。
- Authorization Code用のtoken APIとsession binding。
- GatewayのCUSTOM_JWT、AWS_IAM、offloaded authorization。
- Gateway Policy Engineによる`tools/list`と`tools/call`の評価。
- Cedarのdefault denyとforbid優先。
- Policy spanとGateway trace delivery。

一方、次の一本のE2E契約は公式資料で確認できない。

> Harnessに提示したCognito利用者が、Harness内で開始するOAuthの利用者、Gatewayへ届くprincipal、Cedarが評価するrole、callback後にresumeするHarness interactionと同一であり、追加loginなしで完結する。

primitiveが個別に存在することを理由に、このE2Eを確実に実装できると推測しない。

## 3. 証拠分類

| 分類 | 意味 | 設計への利用 |
|---|---|---|
| 公式事実 | AWS公式資料に直接書かれている | 記述範囲で採用できる |
| 限定付き推論 | 複数の公式事実をWorkOpsが接続した | 推論と明記し、実測gateを要求する |
| 未確認 | 調査対象の公式資料に明文を確認できない | 不存在と断定せず、実装前提にしない |
| 実AWS事実 | API、log、span、CloudTrailで観測した | 別冊02を参照する |
| historical | 特定image、account、commitだけの結果 | 別冊03を参照し、現在へ自動継承しない |

同じURLでも、API version、SDK version、managed image、region、確認日が変われば適用範囲が変わり得る。

別冊05の無効化条件が成立した場合だけ差分を再調査する。

## 4. Managed Harness inbound

### F-OFFICIAL-HARNESS-001 CUSTOM_JWT

[Security and access controls](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/harness-security.html)は、`customJWTAuthorizer`を持つHarnessへ`Authorization: Bearer`で`InvokeHarness`する構成を示す。

[Configure inbound JWT authorizer](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/inbound-jwt-authorizer.html)は、RuntimeとGatewayで`CustomJWTAuthorizerConfiguration`を使えることを説明する。

公式に確認できる範囲：

- issuer。
- audienceまたはallowed client。
- scope。
- Bearer token検証。
- Harness invocationの認証。

公式に確認できない範囲：

- inbound JWTをnative Gateway outboundへraw tokenとして自動forwardする契約。
- inbound JWTの`sub`をOAuth利用者へ自動変換する契約。
- inbound JWTのgroup/role claimをGateway Policy principal tagへ自動伝搬する契約。

### actor ID

[InvokeHarness API](https://docs.aws.amazon.com/bedrock-agentcore/latest/APIReference/API_InvokeHarness.html)は、`actorId`をMemory操作用の値として定義し、Harness構成のactor IDを上書きできるとする。

この事実から、`actorId`をGatewayの認証principalまたはOAuth user identityとみなしてはならない。

### input validation

[Security and access controls](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/harness-security.html)は、Harnessが入力をサニタイズせず、application layerで検証とサニタイズを行うよう求める。

従ってBFFのinput schema、安全なerror、credential非露出はWorkOpsの責務である。

## 5. Managed Harness native tool

### F-OFFICIAL-HARNESS-002 agent loop

[HarnessTool API](https://docs.aws.amazon.com/bedrock-agentcore/latest/APIReference/API_HarnessTool.html)は、Harness agent loopで利用できるtoolの型を定義する。

[Harness tools](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/harness-tools.html)はnative `agentcore_gateway` toolを説明する。

native toolを使う場合、model reasoning、tool selection、tool call、tool resultのagent loopはManaged Harnessが所有する。

### outbound auth

[Boto3 invoke_harness](https://docs.aws.amazon.com/boto3/latest/reference/services/bedrock-agentcore/client/invoke_harness.html)は、native Gateway outbound authとして`awsIam`、`none`、`oauth`を排他的な選択肢として列挙する。

`oauth`はAgentCore Identityを経由するOAuth 2.0 authenticationとして定義される。

[Harness tools](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/harness-tools.html)は`agentcore_gateway`の`outboundAuth.oauth`例を示し、Harness execution roleにGateway ARNへの`bedrock-agentcore:InvokeGateway`が必要とする。

公式資料から確認できないもの：

- `awsIam`で元利用者identityを下流へ自動伝搬すること。
- `oauth`がinbound JWTと同じ利用者を追加loginなしで選ぶこと。
- native Gateway outboundへraw inbound Authorization headerをそのまま渡す専用mode。

## 6. inline functionとの違い

Harness inline functionは、Harness VM内で任意のWorkOps業務処理を完結させるmanaged executionではない。

公式tool call contractでは、Harnessがtool useを返し、clientがtoolを実行し、tool resultを次のinvokeへ戻す。

inline functionを採用すると、WorkOps側がpause、tool実行、tool result再投入、resume、round制御を所有する。

これは現在の「手動loop禁止」要件に合わない。

## 7. AgentCore Identity Authorization Code

### F-OFFICIAL-IDENTITY-001 token response

[GetResourceOauth2Token API](https://docs.aws.amazon.com/bedrock-agentcore/latest/APIReference/API_GetResourceOauth2Token.html)は、応答に次を定義する。

- `authorizationUrl`。
- `sessionStatus`。
- `sessionUri`。
- 利用可能になった`accessToken`。

これはIdentity APIの応答契約であり、Harnessの`InvokeHarness` streamが同じfieldをapplicationへ返す保証ではない。

### callbackとsession binding

[OAuth 2.0 authorization URL session binding](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/oauth2-authorization-url-session-binding.html)は、AgentCore CLIのlocal開発時だけCLIがcallbackと`CompleteResourceTokenAuth`を代行すると説明する。

[CompleteResourceTokenAuth API](https://docs.aws.amazon.com/bedrock-agentcore/latest/APIReference/API_CompleteResourceTokenAuth.html)は、`userIdentifier`を、認可フロー開始に使ったworkload access tokenを生成したOAuth tokenまたはuser IDと定義する。

session binding guidanceは、callback側が現在のapplication sessionを有効と確認し、remote session cacheから利用者IDを復元しないことを要求する。

[MCP server targets](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/gateway-target-MCPservers.html)は、AgentCore Identityが開始者と同意者を検証してからauthorization codeをaccess tokenへ交換し、session bindingをtarget作成時とtool invocation時に適用するとする。

### F-OFFICIAL-IDENTITY-002 個別primitiveとHarness E2Eは別契約

次は個別に公式契約がある。

- OAuth provider。
- Authorization Code。
- authorization URL。
- session URI。
- callback完了API。
- token vault。

次は一体の公開契約を確認できない。

1. HarnessがIdentity APIから得たauthorization URLを、どの`InvokeHarness` eventでapplicationへ返すか。
2. applicationがcallbackを完了した後、どのAPIで中断したHarness interactionをresumeするか。
3. resume対象を`runtimeSessionId`、`sessionUri`、別IDのどれで一意にするか。
4. inbound Cognito JWTの利用者とOAuth同意者をHarnessがどう結び付けるか。
5. 追加loginなしで既存Cognito sessionを利用できるか。

この五点を推測でFrontend/BFF契約にしない。

## 8. Gateway inbound authorization

[Gateway inbound authorization](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/gateway-inbound-auth.html)は、JWT、AWS IAM、offloaded authorizationを列挙する。

現在方式はAWS_IAMを使う。

本人委任へ切り替える場合は、利用者credentialをGatewayが検証できる公式方式と、Cedar principal/tag mappingを同時に確認する。

## 9. Gateway Policy EngineとCedar

### F-OFFICIAL-GATEWAY-001 target前の最終境界

[GatewayPolicyEngineConfiguration API](https://docs.aws.amazon.com/bedrock-agentcore-control/latest/APIReference/API_GatewayPolicyEngineConfiguration.html)は、Policy EngineがGateway境界でagent requestをinterceptし、allow/denyを決める構成を定義する。

Policy connection modeは、Policy resourceのstatusとは別に確認する。

- `LOG_ONLY`では評価しても拒否を強制しない。
- `ENFORCE`でtarget前の拒否を要求する。

### F-OFFICIAL-GATEWAY-002 `allowedTools`は認可境界ではない

Harnessの`allowedTools`はtool候補を絞る。

Gatewayへ直接到達するcall、または候補制限を通過したcallの最終認可を置き換えない。

### F-OFFICIAL-GATEWAY-003 `tools/list`と`tools/call`

[Use Gateway with Policy](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/use-gateway-with-policy.html)は、Policy評価を伴うGateway利用とDENY応答を説明する。

| operation | 役割 | 証拠 |
|---|---|---|
| `tools/list` | principalへ公開可能なtool集合 | returned/denied tool、Policy span |
| `tools/call` | 選択toolと具体的入力の実行認可 | ALLOW/DENY、target到達/非到達 |

`tools/list`で見えなかったことだけを`tools/call` DENYの証拠にしない。

### Cedar semantics

[Policy core concepts](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/policy-core-concepts.html)と[Understanding Cedar policies](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/policy-understanding-cedar.html)は次を定義する。

- 一致する`forbid`が一つでもあればDENY。
- `forbid`なしで少なくとも一つの`permit`が一致すればALLOW。
- どのPolicyも一致しなければDENY。

principal tagにはusername、scope、role等のJWT claimを含められる。

JWT claimをCedarが評価できることと、HarnessからGatewayへ元利用者JWTが届くことは別の契約である。

### Policy対象外または別扱いのoperation

[Use Gateway with Policy](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/use-gateway-with-policy.html)は、promptsとresourcesのMCP operationがpolicy evaluation modeにかかわらずGatewayで許可されると明記する。

tool認可の結論を全MCP operationへ一般化しない。

## 10. MCP protocol revision

### F-OFFICIAL-MCP-001 Gateway正式対応版

[Use an AgentCore gateway](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/gateway-using.html)が列挙するrevisionは次である。

1. `2026-07-28`。
2. `2025-11-25`。
3. `2025-06-18`。
4. `2025-03-26`。

### CloudFormation/CDKの限界

[MCPGatewayConfiguration](https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-properties-bedrockagentcore-gateway-mcpgatewayconfiguration.html)の`SupportedVersions`はstring arrayである。

CDK `MCPProtocolVersion.of(value)`が文字列を受理しても、AWS正式対応またはManaged Harness互換を証明しない。

| gate | 証明できること | 証明できないこと |
|---|---|---|
| TypeScript compile | CDK型が値を受理 | AWS service対応 |
| synth | templateに値が出る | create/update成功 |
| Gateway READY | Gatewayが値を受理 | Harness client互換 |
| 外部SDK initialize | そのSDKが接続 | Harness内蔵client互換 |
| Harness runtime negotiation | 内蔵clientがrevisionを交渉 | Cedar/Target/UI成功 |
| E2E | 対象経路が動く | 別revision・別imageの保証 |

公式ガイドは`2026-07-28`をstateless revisionとして扱う。

legacy `initialize`前提の2025 revisionと同じ手順を日付だけ変えて使わない。

## 11. Observability

### F-OFFICIAL-OBS-001 Policy span

[AgentCore generated Policy observability data](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/observability-policy-metrics.html)は、Policy metricとspanを説明する。

Policy spanで保持する主要field：

- principal。
- action。
- resource。
- authorization decision。
- allowed tools。
- denied tools。
- request ID。
- trace ID。
- span ID。
- Policy EngineまたはGateway resource情報。

AWS公式sampleの値をWorkOps実行証拠として保存しない。

### account/region設定

- X-Ray trace segment destinationを`CloudWatchLogs`へ変更する。
- Transaction Searchを有効化する。
- indexing samplingを設定する。
- X-Rayが`aws/spans`へ書き込むCloudWatch Logs resource policyを作る。

これはaccount/region単位で管理する。

### Gateway設定

- delivery source。
- destination。
- delivery。
- resource ARN。
- `TRACES` log type。
- `XRAY` destination type。

これはGateway単位でIaC管理する。

### application logs

Gateway application logはPolicy spanと同じものではない。

Cedar decisionのために独自application logを追加し、Policy spanと二重管理しない。

### CloudTrail

CloudTrail management eventはCreate/Update/Delete、caller、request ID、409等のcontrol plane調査に使う。

data planeのtool認可結果はPolicy span、Gateway trace、Target logで確認する。

## 12. Gateway interceptor

[Using interceptors with Gateway](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/gateway-interceptors.html)は、request/response interceptorの実行位置を説明する。

interceptorは入力の正規化、追加検証、文脈付与に使える。

次を代替しない。

- Gateway authorizer。
- Policy Engine。
- Cedar default deny。
- target業務validation。

現在のIAM fallbackではJWTをGatewayが受けないため、JWT前提interceptorを関連付けない。

## 13. Custom Runtime

AWS公式はCustom Runtimeについて、Bearer HTTPS invoke、runtime session、streamingを提供する。

一方、Browser向けに次を一体で固定する契約は確認できない。

- CORS/preflight。
- Browser用raw text response stream契約。
- message DTO。
- conversation一覧。
- 内部tool payloadの非表示。
- 全event削除。

これらはCustom Runtime applicationまたはthin relayが所有する。

Runtime sessionだけではWorkOpsの会話履歴UI契約を満たさない。

Custom RuntimeのMMDSv2やMCP成功は、Managed Harnessの能力を証明しない。

## 14. 未確認surface

| ID | 未確認事項 | 実装上の扱い | 確認できた場合の影響 |
|---|---|---|---|
| `U-OAUTH-001` | Harnessがauthorization URLをapplicationへ返す公開field/event | 推測実装しない | 本人委任の解除候補 |
| `U-OAUTH-002` | callbackを受けるownerとURL登録契約 | 推測実装しない | Frontend/BFFの限定変更 |
| `U-OAUTH-003` | callback後に同じHarness interactionをresumeするAPI | 推測実装しない | IAM fallback解除の必須条件 |
| `U-OAUTH-004` | inbound Cognito userとOAuth同意者の同一性 | 追加loginを要求しない | user-bound principalの必須条件 |
| `U-IDENTITY-001` | Gatewayへ届く元利用者`sub` | IAM principalへ縮退 | Cedar OAuthUser切替の必須条件 |
| `U-IDENTITY-002` | role claimのCedar tag mapping | Viewer read-only固定 | role別writeの必須条件 |
| `U-MCP-001` | Managed Harnessの2026 revision対応 | 2025-11単独 | AgDR-0003の切替条件 |

「未確認」を「存在しない」または「作れない」と表現しない。

## 15. WorkOpsで採用できる最小境界

公式契約と未確認surfaceを分けると、現在確証を持てる最小境界は次になる。

```text
Frontend
  Cognito login一回
  BearerをBFFへ送る

BFF
  BearerをHarnessへrelay
  input validation
  response/error正規化

Managed Harness
  CUSTOM_JWT inbound
  agent loop
  native agentcore_gateway
  Managed Memory

Gateway
  AWS_IAM inbound
  MCP 2025-11-25
  Policy Engine ENFORCE

Cedar
  exact Harness role
  Viewer read-only八tool
  default deny
```

最終要求との差はAgDR-0002へ明示し、AWS primitiveが個別に存在することだけで埋めない。

## 16. 無効化条件

次のいずれかが変わった場合だけ、対応する節の差分を再確認する。

- Harness authorizer、tool、outbound authの公式schema。
- `InvokeHarness` request/stream公開型。
- `GetResourceOauth2Token`または`CompleteResourceTokenAuth`契約。
- session binding guidance。
- Gateway inbound authorizer。
- Policy Engine modeまたはCedar entity model。
- supported MCP revision。
- observability fieldまたはdelivery API。
- interceptor execution contract。
- Custom RuntimeのBrowser向け契約。
- Managed Harness image digestまたは対象file hash。

再確認は別冊04のV-00を通し、変更箇所以外を最初から調べ直さない。
