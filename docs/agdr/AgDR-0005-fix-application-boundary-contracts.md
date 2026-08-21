---
id: AgDR-0005
title: Frontend認証、BFF、Managed Memory、list-requestsの境界を固定する
status: accepted
date: 2026-08-21
deciders:
  - WorkOps project owner
  - Codex
---

# Frontend認証、BFF、Managed Memory、`list-requests`の境界を固定する

## 1. 目的

AgentCoreの認証・認可方式を変更しても、Frontend login、BFF error、Memory表示、業務tool入力のapplication契約を同時に壊さないようにする。

また、ユーザー判断が必要な挙動を認証方式変更へ混ぜない。

## 2. Context

過去の問題は四種類に分かれていた。

1. chat hook等が個別にHosted UI redirectを開始し、共通AuthProviderと責務が重複した。
2. BFFがHarness呼出しに加えてMCP、token取得、manual loopまで所有した。
3. Managed Memoryのplain text fallbackが内部protocol断片を通常会話として表示し得た。
4. `list-requests`の共有schema、runtime selector、query、paginationの契約が一致していなかった。

これらはCedarまたはMCP revisionだけでは解決しない。

## 3. 要求

1. Cognito login redirectのownerを一つにする。
2. current originをAmplify標準のredirect設定へ渡す。
3. 認証済み401でredirect loopを起こさない。
4. BFFをthin Bearer relayに限定する。
5. credentialと内部errorをFrontendへ漏らさない。
6. MemoryへHarness messageだけを表示する。
7. raw protocol、tool payload、malformed JSONを通常会話として表示しない。
8. `list-requests`のselector、filter、query優先順位、上限を明示する。
9. pagination等の挙動変更はユーザー判断後に行う。
10. test/spec fileを新しく追加しない。

## 4. Options Considered

| Option | 内容 | 結果 |
|---|---|---|
| A | 各hookが401時にredirectする | loopと責務重複のため不採用 |
| B | AuthProviderだけがloginを所有する | 採用 |
| C | BFFがMCPとmanual loopを所有する | managed-native要件に反するため不採用 |
| D | Memory plain textを後方互換表示する | 内部payload判別不能のため不採用 |
| E | `list-requests`を無条件全件検索にする | scopeと上限のユーザー判断が必要なため不採用 |
| F | 現在のselector契約をfail-closedで固定する | 採用 |

## 5. Decision

次をapplication境界として固定する。

- login redirectは共通`AuthProvider`だけが開始する。
- chat、session、message hookは認証redirectを開始しない。
- BFFはBearer付き`InvokeHarness`一回、Memory API、raw text streamingだけを所有する。
- MemoryはHarness message DTOだけを表示する。
- plain textとprotocol断片をfallback表示しない。
- `list-requests`は三primary selectorの少なくとも一つを要求する。
- 外部paginationは現在提供しない。

## 6. Frontend login契約

### 6.1 owner

Cognito login redirectを開始できるのは共通`AuthProvider`だけである。

次はredirectを開始しない。

- chat hook。
- session一覧hook。
- message履歴hook。
- chat stream error handler。
- individual page component。

token更新失敗はAmplify Auth Hubが通知し、共通`AuthProvider`が固定の認証失敗画面へ切り替える。

chat、session、message hookは認証画面へのredirectを開始しない。

### 6.2 401

未認証状態：

- AuthProviderがlogin開始を判断する。
- 認証前のpathをAmplifyの`customState`へ渡す。
- Auth Hubの`customOAuthState`で同一originのpathを復元する。
- 同時に複数redirectを開始しない。

認証済み状態の401：

- API failureとして扱う。
- 即時にHosted UIへ戻して無限loopを作らない。
- token refreshまたはsession invalidationの既存責務と分ける。

### 6.3 originとcallback

callback/logout URLはcurrent originを使う。

固定`http://localhost:5173/`へ依存しない。

5173、5174、5175はlocal環境で変動し得るため、実際に起動したoriginとCognito allowed URLを一致させる。

Amplify HostingのURLはHosting作成後に確定するため、PortalのApp登録を起点にCognito User Pool Clientへ追記する。

正規経路は次とする。

```text
Portal App create/update
  ↓ urlDomain
App table DynamoDB Stream
  ↓ INSERT/MODIFY
register-callback-url Lambda
  ↓ append only
Cognito User Pool Client callback/logout URLs
```

各Frontendは`window.location.origin`を`redirect_sign_in_uri`と`redirect_sign_out_uri`へ設定してから、`Amplify.configure`を一回実行する。

Amplify Auth自身が現在locationとredirect候補を照合するため、独自`setAuth` wrapperと候補順序の変更は持たない。

認証前のアプリ内pathだけを標準`customState`へ渡し、Auth Hubの`customOAuthState`で復元する。

現在のrepositoryにはApp tableのStream接続がなく、`register-callback-url`もCloudFormation Custom Resource event形式のままである。
従って、この動的登録経路は残課題であり、現在動作していると扱わない。

### 6.4 過去の無限redirectとの分離

過去の無限redirectは、Cognito redirect処理一般が原因ではなく、複数client定義または複数redirect ownerの残骸と分けて扱う。

既存Cognitoの標準redirect処理を、原因未確認のまま独自実装へ置き換えない。

## 7. BFF契約

### 7.1 inbound

- API Gateway Cognito authorizerがBearerを検証する。
- `sub`をactor IDに使う。
- request bodyをschemaで検証する。
- 未認証requestをHarnessへ転送しない。

### 7.2 Harness invoke

- `HttpBearerAuthSigner`で同じBearerをHarnessへ付与する。
- `InvokeHarness`を一回実行する。
- text deltaを`text/plain; charset=utf-8`のresponse bodyへ受信順に逐次中継する。
- `delta`、`done`、`error`等のapplication eventを定義しない。
- request検証とHarness stream確立後にだけHTTP 200を開始する。
- `end_turn`だけを正常完了にする。
- Harnessのagent loopへmanual follow-upを送らない。

### 7.3 存在してはならない責務

- Gateway URL。
- MCP client。
- `tools/list`。
- `tools/call`。
- role別allowedTools。
- toolUse回収。
- toolResult再投入。
- manual pause/resume。
- round上限loop。
- Workload Identity token先取り。
- Resource OAuth token先取り。
- OAuth provider secret。
- callback/resumeの推測contract。

### 7.4 error

Frontendへ返してよいもの：

- 安定したHTTP status。
- machine-readable application error code。
- 利用者が行動できる短いmessage。

返してはならないもの：

- access token。
- Authorization header。
- provider secret。
- raw Harness event。
- raw MCP payload。
- stack trace。
- AWS request body全文。
- internal resource ARN。

## 8. Managed Memory契約

### 8.1 session ownership

- actor IDはCognito `sub`を使う。
- session IDはchat sessionと一対一に対応させる。
- Managed Harness Memoryを会話継続に使う。
- Runtime sessionだけをFrontend履歴一覧の代用にしない。

### 8.2 表示できるmessage

表示対象：

- 正規化されたuser message。
- 正規化されたassistant text message。
- applicationが明示的に許可したmetadata。

表示しない対象：

- toolUse。
- toolResult。
- JSON-RPC request/result/error。
- authorization event。
- token/session URI。
- internal trace payload。
- malformed JSON-like text。
- JSON parseできないplain text。

### 8.3 plain text fallbackを導入しない理由

plain textが通常会話、内部error、protocol断片のどれかを安全に識別するmarkerがない。

旧履歴互換のための独自classifierは、誤表示と誤破棄の両方を生む。

後方互換より内部payload非表示を優先する。

## 9. `list-requests`契約

### 9.1 primary selector

候補は次の三つである。

- `departmentId`。
- `requesterSub`。
- `requestTypeId`。

少なくとも一つを必要とする。

空入力`{}`とstatus-onlyはfail-closedで拒否する。

### 9.2 `status`

`status`はprimary query selectorではない。

取得後のAND filterとして扱う。

未知statusの扱いは現在変更しない。

### 9.3 schemaとruntime

共有tool schemaとGateway tool definitionは同じdefinitionを使う。

flat input schemaでは「三selectorのうち少なくとも一つ」というOR必須を十分に表現できない。

従って次の二層で守る。

1. descriptionへ制約を明記する。
2. Lambda runtimeでselector不存在を拒否する。

schemaが全field optionalであることを、空入力許可と解釈しない。

### 9.4 query優先順位

複数selectorがある場合、primary queryは次の順に選ぶ。

1. `departmentId`。
2. `requesterSub`。
3. `requestTypeId`。

残りselectorと`status`は取得後にAND filterする。

この優先順位は実装の現在値であり、利用者へ保証する外部仕様にはまだしない。

### 9.5 pagination

- 内部一pageは100件。
- 最大三pageを取得する。
- 内部上限は300件。
- 外部outputは`items`だけである。
- 外部`limit`はない。
- 外部`nextToken`はない。
- 300件を越える続きをcallerが取得する契約はない。

現在の契約で300件超を完全取得できると表現しない。

## 10. 意図的に実装しない挙動

### D-APP-01 外部pagination

実装しないもの：

- selectorなしの全件検索。
- status-only検索。
- 外部`limit`。
- 外部`nextToken`。
- schema `anyOf`/`oneOf`拡張。
- selector別tool分割。
- status未知値の新しい拒否規則。

### 解除前に必要なユーザー判断

1. selectorなしを許可するか。
2. selectorなしの場合のscopeを全件、利用者部署、別scopeのどれにするか。
3. status-onlyを許可するか。
4. 複数selectorを外部AND契約にするか。
5. GSI優先順位を外部仕様にするか。
6. 300件上限を正式契約にするか。
7. 外部`limit`と`nextToken`を提供するか。
8. 未知statusをschema error、runtime error、0件のどれにするか。

判断なしに実装しない。

### D-APP-02 Hosting originのCognito動的登録

PortalのApp登録を起点とする動的登録は残課題とする。

現在存在するもの：

- Appモデルの`urlDomain`。
- PortalのApp create/update。
- Cognito User Pool Clientをdescribe/updateする`register-callback-url` Lambda source。

現在存在しないもの：

- `register-callback-url`の`DynamoDBStreamHandler`契約。
- `register-callback-url`の`defineBackend`登録。
- App tableから同Lambdaへの`DynamoEventSource`。
- `USER_POOL_ID`と`CLIENT_ID`の環境変数。
- `DescribeUserPoolClient`と`UpdateUserPoolClient`の実行権限。
- 複数App登録時のread-modify-write競合を防ぐ直列化。
- Portal登録からCognito追記までのsandbox検証。

解除条件：

1. `INSERT`と`MODIFY`の`NewImage.urlDomain`だけを登録対象にする。
2. URLをCognito callback/logout URLと一致するorigin-root形式へ正規化する。
3. 既存callback/logout URLを保持し、未登録URLだけを追記する。
4. App削除時は、他Appまたは既存deploymentによる利用を判定できないためURLを削除しない。
5. 同時登録で既存URLを失わない直列化または同等の競合対策を設ける。
6. Cognito User Pool Clientのcallback以外の設定を変更しないことを確認する。
7. sandboxで二つのApp URLを登録し、両方がCognitoへ残ることをAPIで確認する。
8. 各Hosting originからCodex自身がlogin E2Eを行い、ユーザーへloginを依頼しない。

この条件を満たす実装と検証を行うまで、Hosting originの自動登録を成立済みに繰り上げない。

## 11. Consequences

### Positive

- login ownerが一つになり、redirect loopを避けられる。
- BFFが認可正本またはagent loopを持たない。
- internal payloadをMemory履歴へ表示しない。
- `list-requests`の空入力をfail-closedにできる。
- 認証変更と業務pagination変更を分けられる。

### Negative

- plain textだけの旧Memory messageを表示しない。
- `list-requests`は300件超の続きを返せない。
- schemaだけではselector OR必須を表現できず、runtime guardが必要である。
- Portal App StreamによるHosting URLのCognito動的登録が未実装である。
- test/spec fileを持たないため、buildと代表E2Eで境界を確認する。

## 12. Verification

repositoryにはtest/spec fileを保持しない。

変更時に次を確認する。

1. 三FrontendのTypeScript/Vite build。
2. Shared Backend TypeScript build。
3. 各Frontendのcurrent originを使ってCognito loginが完了するE2E。
4. 認証済み401でredirect loopが起きない。
5. chat POSTのBearerがHarnessへ一回だけ渡る。
6. Harnessの複数text deltaがraw UTF-8 textとしてbufferされず、受信順にFrontendへ届く。
7. BFF sourceに禁止責務がない。
8. Memory履歴へraw protocolが出ない。
9. `list-requests`の空入力とstatus-onlyが安全に拒否される。
10. API errorが内部詳細をUIへ出さない。
11. Codex自身がloginし、ユーザーへloginを依頼しない。

詳細手順は別冊04を正本とする。

## 13. Revalidation Conditions

次が変わった場合だけ該当契約を再確認する。

- Amplify Auth SDK version。
- callback/logout URL一覧。
- App table Streamと`register-callback-url` Lambda。
- Vite起動方式またはport選択。
- AuthProvider。
- chat/session/message hookの401処理。
- Harness event stream schemaまたはBrowser response stream契約。
- Memory envelopeまたはstrategy。
- `list-requests` selector、GSI、page limit、output。
- plain text履歴互換に関するユーザー判断。
- paginationに関するユーザー判断。

## 14. Artifacts

- `apps/portal/src/main.tsx`
- `apps/asset-catalog/src/main.tsx`
- `apps/request-manager/src/main.tsx`
- `packages/shared-chatbot/src/hooks/useChatBot.ts`
- `packages/shared-backend/amplify/function/agentcore-bff/handler.ts`
- `packages/shared-backend/amplify/function/agentcore-bff/harness-client.ts`
- `packages/shared-backend/amplify/function/agentcore-bff/managed-memory.ts`
- `packages/shared-backend/amplify/bedrock-agentcore/tool-access.ts`
- `packages/shared-backend/amplify/bedrock-agentcore/gateway/asset/tool-schemas.ts`
- `packages/shared-backend/amplify/bedrock-agentcore/gateway/request/tool-schemas.ts`
- `docs/research/agentcore/01-official-contracts-and-open-surfaces.md`
- `docs/research/agentcore/02-current-implementation-and-live-results.md`
- `docs/research/agentcore/04-verification-and-revalidation-runbook.md`
- `docs/research/agentcore/05-research-results-index.md`

Git履歴上の旧test結果はhistorical evidenceであり、現在のrepositoryにtest/spec fileは存在しない。
