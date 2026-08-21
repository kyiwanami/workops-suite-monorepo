# AgentCore検証・再確認runbook

作成日：2026-08-21。

## 1. 目的

本書は、現在採用するManaged Harness native構成を、推測なしで検証する手順を定める。

対象は次である。

- local source。
- build。
- synth template。
- sandbox作成条件。
- AWS control plane。
- 最小SDK/API確認。
- observability。
- Browser E2E。
- cleanup。
- 本人委任と新MCP revisionへ切り替える条件。

過去spikeの実行計画や旧test commandは扱わない。

過去に失敗した条件と再実施禁止事項は別冊03を正本とする。

## 2. 検証の原則

### 2.1 調査と検証を分ける

調査は、何が公式に可能か、どの候補が成立し得るかを確定する。

検証は、成立可能性を得た一方式がWorkOpsの条件で実際に動くかを確かめる。

API call、sandbox、Browserは候補探索ではなく、確証取得にだけ使う。

### 2.2 証拠の強さを飛ばさない

次の順で証拠を強くする。

1. 公式契約。
2. local sourceとSDK公開型。
3. synth template。
4. AWS control plane。
5. 最小SDK/API実行。
6. Managed Harness runtime実行。
7. Gateway/Cedar/Target相関。
8. Supported UI E2E。

上位の結果を下位の成功へ読み替えない。

### 2.3 ユーザー判断を先に得る

次の挙動を変更する場合、実装前にユーザー判断を得る。

- 追加loginまたは認証画面。
- role別tool公開範囲。
- write/delete/approveの副作用。
- `list-requests`のpagination、filter、上限、並び順。
- Memory履歴の表示範囲。
- Browser E2Eの録画有無。

追加loginを要求する方式は、現在の明示制約により質問せず棄却する。

## 3. V-00 調査開始前gate

Web、過去thread再読、image取得、SDK spike、AWS API、sandbox、Browserを開始する前に次を埋める。

```markdown
### INV-YYYYMMDD-NN 調査質問

- 質問:
- 対応する既存Claim:
- 既存status:
- 既存の適用範囲:
- 成立した無効化条件:
- 今回だけ確認する差分:
- 使う最小手段:
- user decisionの有無:
- 実装停止条件:
- cleanup:
- 結果:
- 更新するClaim:
```

合格条件は次である。

| 項目 | 合格条件 |
|---|---|
| 調査質問 | 一文で定義されている |
| 既存Claim | 別冊01、02、03、05とAgDRを検索済み |
| 無効化条件 | 何が変わったかを値で示せる |
| 差分 | 過去に確認していない部分だけに限定される |
| user decision | 挙動が変わる点は先に確認済み |
| Browser許可 | ユーザーが明示している |
| AWS対象 | profile、account、regionを省略していない |
| destructive scope | exact targetをread-only確認済み |
| cleanup | 成功時と失敗時の両方を定義済み |

無効化条件が成立していない場合、同じ調査を開始しない。

## 4. V-01 local source gate

### 4.1 BFF

存在すべき責務は次である。

- Cognito Bearer必須化。
- `InvokeHarnessCommand`。
- `HttpBearerAuthSigner`。
- actor IDとしてCognito `sub`を渡す処理。
- Harnessのtext deltaを`text/plain; charset=utf-8`で受信順に逐次中継。
- Browser向けの`delta`、`done`、`error` event、schema、parserを持たない。
- `end_turn`確認。
- stream開始前のsafe JSON errorと、開始後の異常終了。

存在してはならない責務は次である。

- Gateway URLの保持。
- MCP client。
- `tools/list`。
- `tools/call`。
- role別`allowedTools`計算。
- toolUse回収。
- toolResult再投入。
- manual pause/resume。
- maximum round loop。
- `GetWorkloadAccessTokenForJWT`。
- `GetResourceOauth2Token`。
- `CompleteResourceTokenAuth`。
- OAuth provider secret処理。

検索例：

```powershell
$bffRoot = 'packages/shared-backend/amplify/function/agentcore-bff'

rg -n --glob '!*.test.*' --glob '!*.spec.*' `
  'McpClient|tools/list|tools/call|toolResult|maxIterations|GetWorkloadAccessTokenForJWT|GetResourceOauth2Token|CompleteResourceTokenAuth' `
  $bffRoot
```

結果が0件でない場合、名前の偶然一致か禁止責務の再導入かを行単位で判定する。

### 4.2 Managed Harness

確認するsource契約は次である。

- CUSTOM_JWT inbound。
- native `agentcore_gateway`一件。
- `outboundAuth.awsIam`。
- `allowedTools: ["*"]`。
- Managed Memory。
- Gateway ARNへの`InvokeGateway` IAM。
- inline function不存在。
- remote MCPへのraw Authorization不存在。

### 4.3 Gateway

- authorizerはAWS_IAM。
- `supportedVersions`は`2025-11-25`単独。
- Policy Engine connection modeは`ENFORCE`。
- JWT request interceptorを関連付けない。
- `TRACES` deliveryを持つ。
- Targetは現在の八read-only toolを公開する。

### 4.4 Cedar

- principal typeは`AgentCore::IamEntity`。
- STS assumed-role principalはregionなしのentity表現を使う。
- exact Harness roleを許可する。
- resourceはexact Gateway ARN。
- actionはexact `${tool}___${tool}`。
- Viewer read-only八Policyだけをpermitする。
- Policy名にidentifier/deployment keyを含める。
- write、delete、approveはdefault denyに残す。

### 4.5 FrontendとMemory

- login redirect ownerは共通`AuthProvider`だけである。
- 認証前のpathはAmplifyの`customState`へ渡し、Auth Hubの`customOAuthState`で同一originへ復元する。
- Amplify Auth Hubのtoken更新失敗は共通`AuthProvider`が固定の認証失敗画面へ反映する。
- chat/session/message hookは自身でredirectを開始しない。
- 各Frontendが`window.location.origin`をAmplify標準のredirect sign-in/sign-out設定へ渡す。
- Memory messageはHarness DTOだけを表示する。
- plain text、malformed JSON、内部tool payloadをUIへfallback表示しない。

### 4.6 Portal App callback登録

残課題を解除する場合だけ、次をすべて確認する。

- App tableにStreamがある。
- `register-callback-url`が`DynamoDBStreamHandler`である。
- triggerは`INSERT`と`MODIFY`の`NewImage.urlDomain`を扱う。
- App削除でCognito URLを削除しない。
- Lambdaにexact User Poolだけのdescribe/update権限がある。
- User Pool IDとClient IDを環境変数から取得する。
- callback/logout以外のUser Pool Client設定を保持する。
- 二つの異なるApp URLを連続登録しても両方が残る。
- 同時実行時のread-modify-write競合を防いでいる。
- 各Frontendの`Amplify.configure`が現在のHosting originをredirect URIとして設定する。

いずれかがない場合、動的callback登録を成立済みにしない。

## 5. V-02 build gate

repositoryにはtest/spec fileを保持しない。

依存関係操作を行わず、次を実行する。

```powershell
npm run build --workspaces --if-present
```

timeoutは300,000msとする。

合格条件：

- Asset Catalog buildが終了コード0。
- Portal buildが終了コード0。
- Request Manager buildが終了コード0。
- Shared Backend buildが終了コード0。
- TypeScript error 0件。
- Vite chunk size warningは既知warningとしてerrorと分離する。
- `git diff --check`が終了コード0。

ユーザーの明示許可なしに`npm install`、`npm i`、`npm ci`、`npm prune`、`npm dedupe`、`npm uninstall`を実行しない。

## 6. V-03 synth/template gate

AWS変更前に生成templateで次を確認する。

1. Gateway authorizerがAWS_IAM。
2. `supportedVersions`が2025-11単独。
3. Policy modeがENFORCE。
4. Harness toolがnative Gateway一件。
5. Harness outboundがIAM。
6. old inline function toolがない。
7. raw Authorization付きremote MCPがない。
8. JWT interceptorをGatewayへ関連付けていない。
9. Viewer八Policyのactionとresourceがexact一致する。
10. Cedar principalがregionなし。
11. Policy名がidentifier/deployment keyで分離される。
12. Cognito domain prefixがidentifier由来のstable hashで分離される。
13. Gateway `TRACES` deliveryが存在する。
14. account共通Transaction Searchをsandbox resourceとして作らない。

identifierを変更しても同じphysical nameになるresourceが一つでもあれば、sandbox作成前に修正する。

## 7. V-04 sandbox作成gate

sandboxは次の場合だけ使う。

- SDK/API最小確認では閉じられないCloudFormation lifecycleがある。
- Managed Harness内蔵clientでしか確認できない。
- Policy Engine、Cedar、Targetの連続した実行証拠が必要。
- Supported UIまでの最終E2Eが必要。

作成前に次を固定する。

| 項目 | 必須内容 |
|---|---|
| workspace | この作業専用のworktreeを使う理由 |
| identifier | 既存と異なる明示値 |
| package | `@workops-suite/shared-backend` |
| domain prefix | stable hashの予測値 |
| profile | 暗黙値禁止 |
| account | STSで実値確認 |
| region | 明示値 |
| stack name | 予測値 |
| physical names | identifier非依存名がない |
| cleanup | 成功時保持か削除か、失敗時削除対象 |

profile横断のdomain検索は、アクセス可能accountにおける存在確認であり、全AWS accountの予約確認ではない。

最終的な利用可能性はCreate結果で確定する。

## 8. V-05 deploy gate

1. watch processを使わず`--once`を使う。
2. root stack、nested stack、AgentCore resource eventを同時に確認する。
3. Amplify CLIの表面errorだけで原因を決めない。
4. Create/Update APIのrequest IDを確認する。
5. 409はCloudTrailと全Policy Engineを検索し、同名resourceの所在を確定する。
6. 初回作成契約が誤っている場合、失敗stackを削除し、修正後に新規作成する。
7. updateを使う場合、既存resourceを維持する目的とreplacement有無を先に確認する。
8. 非同期削除中のHarnessを残したまま同名作成へ進まない。
9. Cognito domainが削除完了するまで再作成しない。

## 9. V-06 control plane gate

CloudFormation成功だけで合格にしない。

実APIで次を読む。

### Harness

- status。
- inbound authorizer。
- native tool definition。
- outbound auth。
- `allowedTools`。
- Memory strategyとretention。
- runtime role。

### Gateway

- status。
- authorizer。
- supported versions。
- Policy Engine connection mode。
- interceptor association。
- Target一覧とstatus。

### Cedar

- Policy Engine status。
- 全Policy status。
- Cedar text。
- exact principal、action、resource。
- deployment key付きPolicy名。

### Observability

- trace delivery source。
- destination。
- delivery status。
- resource ARN。

### Cognito

- User Pool ID。
- client ID。
- callback/logout URL。
- domain prefixとstatus。

AWS MCPを使う場合は対象環境の`aws_profile`を必ず明示する。

このprojectでもAWS MCPの既定profileを暗黙利用しない。profileが対応表にない場合は、CLI/APIの対象を明示するかユーザーへ確認する。

## 10. V-07 最小SDK/API gate

SDK/API確認は、公式資料、schema、sourceから成立可能性を得た方式の確証にだけ使う。

IAM Gatewayのdirect deny確認：

1. SigV4 signerを使う。
2. 対象Gatewayのsupported revisionをMCP clientへ明示する。
3. `initialize`を実行する。
4. `tools/list`を実行する。
5. 非許可principalのtool一覧が0件であることを確認する。
6. 非許可toolを名前指定で`tools/call`する。
7. `Tool Execution Denied`を確認する。
8. Policy spanでDENYを確認する。
9. Target Lambda logに同時刻eventがないことを確認する。

記録する値：

- caller ARN。
- Gateway ID。
- MCP revision。
- request ID。
- trace ID。
- tool名。
- Cedar decision。
- Lambda非到達を確認した時間窓。

この成功はManaged Harness自身のnegotiation、native tool実行、UI成功の代用にならない。

## 11. V-08 observability gate

### account/region単位

- trace segment destinationは`CloudWatchLogs`。
- statusは`ACTIVE`。
- Transaction Search indexingは`1%`。
- `aws/spans`へX-Rayが書き込めるCloudWatch Logs resource policyがある。

### Gateway単位

- `TRACES` delivery sourceがある。
- resource ARNは対象Gatewayである。
- destination typeは`XRAY`である。
- deliveryが有効である。

### trace相関

次を同一traceまたはrequest chainで対応付ける。

1. Harness runtime session/request時刻。
2. Gateway `Initialize`。
3. `tools/list`。
4. `PartiallyAuthorizeActions`。
5. `AuthorizeAction`。
6. `tools/call`。
7. Target CLIENT span。
8. Lambda log。

Policy spanでは最低限、principal、action、resource、decision、denied_tools、request ID、trace IDを確認する。

Gateway `APPLICATION_LOGS`を独自追加して標準Policy spanと二重管理しない。

## 12. V-09 Browser E2E gate

### 12.1 開始前

1. ユーザーがBrowser利用を明示していることを確認する。
2. E2Eスキルの手順に従う。
3. 録画有無を開始時に確認する。
4. ChatWidgetを所有するappとrouteをsourceで確認する。
5. localhost portと起動processを確認する。
6. viewportを不用意に変更しない。
7. 自分のtask用Browser tabだけを操作する。
8. 既存の認証済み状態を壊さない。

### 12.2 login

- ユーザーへlogin操作を依頼しない。
- Codex自身が一時Cognito userを作成する。
- permanent password、email verified、必要groupを設定する。
- credentialをfile、console、文書へ保存しない。
- Managed LoginへCodex自身が入力する。
- callback後のappとrouteを確認する。

### 12.3 read allow

- 副作用のない代表toolを一件使う。
- chat POST 200を確認する。
- UIに実結果が表示される。
- Harness runtime logでMCP negotiationを確認する。
- Cedar ALLOWを確認する。
- Gateway `tools/call`成功を確認する。
- Target Lambda到達を確認する。

### 12.4 write deny

現在のViewer tool公開がread-onlyである場合、UIだけではCedar DENYを証明できない。

denyは次を組み合わせて確認する。

- UI上で副作用toolが利用可能として表示されないこと。
- BFFに静的role-tool拒否がないこと。
- direct Gateway callでCedar default denyになること。
- `PartiallyAuthorizeActions.denied_tools`またはPolicy decisionがDENYであること。
- 対象Lambdaにeventがないこと。

### 12.5 evidence

- trace ID。
- request ID。
- timestampとtimezone。
- Gateway ID。
- Harness runtime log group。
- Target Lambda log group。
- screenshotまたは動画のbytes、codec、resolution、fps、duration、SHA-256。
- 成功証拠と失敗証拠をファイル名で区別する。

## 13. V-10 cleanup gate

### E2E

1. 作成したchat sessionをDELETEする。
2. 一時Cognito userを削除する。
3. `UserNotFoundException`を確認する。
4. 自分が開いたBrowser tabを閉じる。
5. local Vite processを停止する。
6. credentialが保存されていないことを確認する。

### 失敗sandbox

1. exact root stackを確認する。
2. 削除対象が意図したidentifierであることを確認する。
3. Harnessの非同期削除を待つ。
4. stack `DELETE_COMPLETE`を確認する。
5. Cognito domain候補が残っていないことを確認する。
6. 既存の成功sandboxを削除しない。

### spike resource

- Runtimeは`ResourceNotFoundException`。
- IAM roleは`NoSuchEntity`。
- S3 object versionとdelete markerは0件。
- local生成artifactは削除済み。
- temporary credentialは保存されていない。

削除したresource IDと、復旧可能性を結果文書へ記録する。

## 14. 本人委任への切替gate

本人委任は、次をすべて満たすまで実装しない。

### V-IDENTITY-01 公式surface

- Harnessがauthorization URLを返す公開fieldまたはevent。
- callback URLの所有者。
- session binding識別子。
- callback完了API。
- 同じHarness interactionのresume APIまたはevent。
- Gatewayに到達する`userIdentifier`。
- Cedar `OAuthUser` principalまたは同等の公式entity。

各値を公式API、SDK公開型、または固定imageの公開contractで確認する。

### V-IDENTITY-02 一回login

- 既存Cognito loginを利用する。
- 二度目のlogin画面を出さない。
- ユーザーへloginを依頼しない。
- callback開始者と認可主体が同じであることを検証する。
- token、state、sessionをURLまたはlogへ漏らさない。

### V-IDENTITY-03 responsibility

- Managed Harnessがagent loopとnative Gateway toolを所有する。
- BFFはBearer付きHarness invoke一回とresponse relayだけを持つ。
- BFF token先取り0件。
- BFF MCP client 0件。
- BFF manual callback/resume 0件。
- Gatewayは利用者credentialを公式方式で検証する。
- Cedarが利用者identityとroleを評価する。

### V-IDENTITY-04 representative authorization

| principal | tool | 期待 |
|---|---|---|
| Viewer | representative read | ALLOW、Target到達 |
| Viewer | representative write | DENY、Target未到達 |
| Editor | representative update | ALLOW、Target到達 |
| Manager | manager tool | ALLOW、Target到達 |
| Global Admin | restricted tool | ALLOW、Target到達 |

副作用fixtureを安全に作れない場合、全role×全toolを実行しない。

静的Policy matrix、direct deny、代表E2Eを組み合わせる。

### V-IDENTITY-05 change surface

変更を次へ限定する。

1. Harness outbound auth。
2. Gateway authorizer。
3. Cedar principalとPolicy。
4. 必要なJWT interceptor。

BFF、Frontend、Managed Memory、native Gateway tool、業務Targetを全面変更しない。

### V-IDENTITY-06 rollback

一つでも失敗した場合：

1. Harness outboundをAWS_IAMへ戻す。
2. Gateway authorizerをAWS_IAMへ戻す。
3. exact Harness role向けViewer八Policyへ戻す。
4. JWT interceptorを外す。
5. MCP `2025-11-25`単独を維持する。
6. inline bridge、Custom Runtime、Client Credentialsを導入しない。

## 15. MCP revision切替gate

1. AWS公式対応revisionの差分を確認する。
2. Managed Harness imageまたはrelease差分を確認する。
3. `supportedVersions`だけを変更する。
4. control planeで反映を確認する。
5. runtime logで実negotiation revisionを確認する。
6. direct denyを確認する。
7. Managed Harness read allowを確認する。
8. Cedar ALLOW/DENYとTarget到達/非到達を確認する。
9. Supported UI回答を確認する。
10. 失敗時は`2025-11-25`単独へ戻す。

dual advertisementを自動fallback保証として扱わない。

## 16. 合格の定義

現在方式の検証完了は、次をすべて満たすことをいう。

1. V-00で既存結果と差分を固定した。
2. V-01で禁止責務がsourceにない。
3. V-02で全workspace buildが成功した。
4. V-03でtemplate契約が一致した。
5. V-04を満たす場合だけsandboxを作成した。
6. V-05でdeploy原因とlifecycleを記録した。
7. V-06でactual control planeを確認した。
8. V-07のAPI結果をManaged Harness成功へ読み替えていない。
9. V-08でPolicy、Gateway、Targetを相関した。
10. ユーザーがBrowserを許可した場合、V-09をCodex自身が実施した。
11. V-10のcleanupを完了した。
12. 結果を別冊02、失敗を別冊03、無効化条件を別冊05へ反映した。
