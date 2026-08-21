# Browser向けChatストリーミング方式の調査

調査日：2026年8月21日。

状態：調査、実装、sandbox配備、Browser E2E完了。

## 1. 調査開始票

### INV-20260821-01 Browser向けChatストリーミング方式

- 質問：WorkOpsのChatストリーミング要件は正本へ記載され、現在のSSEと独自event型は2026年8月21日時点のシンプルな推奨方式か。
- 対応する既存Claim：`F-LOCAL-001`、`F-BUILD-001`、AgDR-0005 §7.2と§12、別冊04 V-01。
- 既存status：BFFの逐次中継とbuildは`confirmed`、現在deploy済みsourceのBrowser E2Eは未実施。
- 既存の適用範囲：BFFがHarnessのtext deltaをSSEへ逐次中継することまでで、Browser向けprotocolの必要性は比較されていない。
- 成立した無効化条件：利用者がストリーミングを明示要件として再提示し、`delta`、`done`、`error`、独自型を使う必要性と最新方式への適合を要求した。
- 今回だけ確認する差分：Browserが必要とするpayload、AWS response streaming、plain text stream、SSE、terminal、error、型、観測方法。
- 使う最小手段：既存文書、現在source、導入済みSDK型、AWS公式文書、WHATWG HTML Living Standard、AI SDK公式文書、OpenAI公式API Reference、Anthropic公式API文書。
- user decisionの有無：調査だけが許可されている。実装、deploy、Browser E2Eは行わない。
- 実装停止条件：方式変更は利用者判断まで停止する。
- cleanup：AWS resource、local process、Browser tabを作成しないため不要。
- 結果：AWS response streaming経路は妥当だが、Browser向けSSEと`delta`、`done`、`error`の独自protocolは現在要件に不要である。raw UTF-8 text streamを推奨する。
- 更新するClaim：`F-STREAM-001`から`F-STREAM-009`。

本票は本来、公式文書を確認する前にファイルへ記録すべきだった。

今回は調査質問と停止条件を作業更新で先に固定したものの、ファイルへの記録が後になった。

以後は別冊04 V-00の順序どおり、票を保存してから外部確認へ進む。

## 2. 判断条件

既存protocolの維持、後方互換、段階移行は考慮しない。

Browserへ必要な情報だけを、AWSとWeb platformの標準機能で最短に流す方式を選ぶ。

現在のChat UIがstream中に必要とする情報はassistant textだけである。

次の情報をBrowserへ公開する要件はない。

- tool use。
- tool result。
- reasoning content。
- token usage。
- provider metadata。
- content block index。
- stop reason。
- retry指示。
- reconnect用event ID。

従って、複数種類のdataを多重化するprotocolは不要である。

## 3. ストリーミング要件の記載状況

ストリーミング要件は記載されているが、方式の必要性までは整理されていない。

既存の正本には次がある。

- AgDR-0005 §7.2は、Harnessのtext deltaを受信順にSSEへ逐次中継すると定める。
- AgDR-0005 §12は、複数text deltaがbufferされず受信順にFrontendへ届くことを検証条件にする。
- 別冊02 `F-LOCAL-001`は、BFFがtext deltaを逐次中継し、`end_turn`だけを正常完了にすると記録する。
- 別冊04 V-01は、逐次中継と`end_turn`確認をBFFの必須責務にする。
- READMEはBFFがSSE整形を担当すると記載する。

不足していたのは、「なぜSSEが必要か」と「なぜ三eventが必要か」の比較である。

SSE採用自体が前提となり、plain text response streamingが候補に入っていなかった。

## 4. AWS側の実現方式

現在sourceのAWS経路は妥当である。

```text
Managed Harness InvokeHarness event stream
  ▼
AgentCore BFF Lambda
  │ awslambda.streamifyResponse
  ▼
API Gateway REST API
  │ AWS_PROXY
  │ ResponseTransferMode.STREAM
  ▼
Browser fetch Response.body
```

AWSはAPI Gateway response streamingの代表用途として、生成AI chatbotのTTFB短縮を明記している。

REST APIのproxy integrationで`responseTransferMode`を`STREAM`にすると、API Gatewayは全応答の完了を待たずにclientへ送り始める。

現在の`AgentRestApi`はRegional REST API、Lambda proxy integration、`ResponseTransferMode.STREAM`を使用している。

LambdaはNode.js 24の`awslambda.streamifyResponse()`と`HttpResponseStream.from()`を使用している。

このAWS構成は変更する必要がない。

API Gatewayはstream payloadにSSEを要求していない。

metadataとdelimiterの後ろはraw payloadであり、applicationが任意の形式を選べる。

## 5. 現在の独自protocol

調査開始時点のsourceはHarnessのtext deltaを次のSSEへ変換していた。

```text
event: delta
data: {"text":"回答の断片"}

event: done
data: {}

event: error
data: {"message":"安全なエラー文"}
```

BackendとFrontendは、同じ形を別々のZod discriminated unionとして定義している。

Frontendには独自SSE parser、UTF-8 chunk復元、event shape検証、EOF処理がある。

このprotocolは不正な方式ではない。

OpenAIとAnthropicも、text delta、完了、errorを含むstructured streamを提供している。

しかし、両APIはtool、reasoning、usage、複数content blockなどを同じstreamへ載せるためにstructured eventを使う。

WorkOpsのBrowser境界は、それらを意図的に公開しない。

textだけを渡す境界に三eventを持ち込むと、次の独自実装が必要になる。

- `ChatSseEvent`。
- `ChatStreamEvent`。
- `chatSseEventSchema`。
- `chatStreamEventSchema`。
- `sseFrame`。
- `SseParserState`。
- `parseSseChunk`。
- `finishSse`。
- `done`を解釈するstream state。
- `error`後のeventを拒否するstream state。

現在要件に対して過剰である。

## 6. 推奨方式

Browser向けresponseをraw UTF-8 text streamにする。

```text
Content-Type: text/plain; charset=utf-8

回答の断片1回答の断片2回答の断片3
```

BFFはHarnessの`contentBlockDelta.delta.text`を受信順にresponse bodyへそのままwriteする。

Browserは`Response.body.getReader()`と`TextDecoder`のstream modeで読み、decodeしたtextをassistant messageへ追記する。

正常完了はBFFがHarnessの`messageStop.stopReason === "end_turn"`を確認し、response streamを正常に`end()`したときのEOFで表す。

異常終了は次の二つに分ける。

1. response開始前の失敗はHTTP JSONの4xxまたは5xxで返す。
2. response開始後の失敗はstreamを異常終了させ、Frontendのreader errorとして扱う。

Frontendはreader error時に部分回答を安全な固定文へ置き換える。

この方式では次が不要になる。

- SSE。
- `event:`と`data:` framing。
- `delta` event。
- `done` event。
- `error` event。
- Chat stream event union。
- Zodによるstream event schema。
- 独自SSE parser。
- terminal event state machine。
- BackendとFrontendのprotocol型共有package。

AI SDKの公式文書もtext-only用途にplain text streamを定義し、`text/plain; charset=utf-8`で各text deltaをchunkとして書く方式を提供している。

structured data、tool、source、reasoningなどが必要な場合だけ、同SDKは別のdata stream protocolを使う。

WorkOpsの現在要件は前者に一致する。

## 7. SSEを使わない理由

SSEは複数のnamed event、reconnect、event ID、retry、keep-aliveなどが必要な場合に意味がある。

現在のChat POSTは、一requestに対して一回答を返す有限streamである。

自動reconnectは同じChat turnを重複実行させるため、要求されていない。

native `EventSource`も使っていない。

endpointはPOST bodyと`Authorization` headerを必要とするため、Frontendはどのみち`fetch`を使う。

従って、SSE framingだけを独自に実装する利点がない。

## 8. 型の扱い

Browser向けprotocol固有の型は不要になる。

必要な型は既存の画面DTOだけである。

```typescript
interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}
```

stream chunkはWeb platformの`Uint8Array`を`TextDecoder`でstringへ変換する。

独自の`DeltaEvent`、`DoneEvent`、`ErrorEvent`は作らない。

Harness側ではAWS SDKの`InvokeHarnessStreamOutput` unionをそのまま使い、Browser境界へ出さない。

これにより、AWS側はAWS公式型、Browser側はWeb標準型だけを使う。

## 9. errorの注意点

raw text streamは、response開始後のapplication error payloadを持たない。

これは欠陥ではなく、simple text streamの性質である。

AI SDKもsimple text streamでerror chunkを持たず、stream errorをthrowする方式を採る。

一方、API GatewayとLambdaの間で異常終了したstreamがBrowserの`ReadableStream`へ確実にerrorとして届くかは、AWS公式文書だけではBrowser側の挙動まで明文化されていない。

response開始後のerrorは本文へ混ぜず、Node.js streamを異常終了する。

Browserの`reader.read()`またはfetch body consumptionがrejectした場合、UIは部分回答を安全な固定文へ置き換える。

API Gatewayが異常終了を正常EOFとして提示した場合は、受信済みの部分textを保持する。

この違いを識別するためのin-band terminal markerは追加しない。

## 10. 実装で解消したsourceの問題

方式変更前のsourceには、次の不整合もあった。

### pre-stream errorの開始順序

BFFはSSE 200を開始してからBearer抽出と`InvokeHarness`を行っていた。

このため、response開始前にHTTP 400または502として返せるfailureもin-band SSE errorになっていた。

raw text実装では、入力検証、Bearer抽出、Harness stream取得までをresponse metadata送信前に完了させた。

### POST path validation

POSTは`started = true`の後でsession IDをUUID parseしていた。

path不正時にouter error handlerがJSON errorを返さない分岐があった。

現在はresponse開始前にsession IDを確定させる。

### backpressure

旧実装は`response.write()`の戻り値を確認していなかった。

AWSはWritable streamを扱う場合、可能ならNode.jsの`pipeline()`を使うよう推奨している。

現在はHarnessのAsyncIterableからtextだけを生成し、`Readable.from`と`pipeline()`でLambda response streamへ接続する。

### streaming observability

API Gateway公式は次のaccess log変数を案内する。

- `$context.integration.responseTransferMode`。
- `$context.integration.timeToAllHeaders`。
- `$context.integration.timeToFirstContent`。
- `$context.integration.latency`。

旧`AccessLogFormat.jsonWithStandardFields()`には含まれていなかった。

現在はcustom JSON access logへ四項目を追加し、raw text版のBrowser E2Eで実AWS値を確認した。

## 11. Claim

### F-STREAM-001 ストリーミング要件の記載

status：`confirmed`、ただし方式比較が不足していた。

逐次中継と非buffer検証は記載済みである。

SSEと独自三eventが必要である根拠は記載されていない。

### F-STREAM-002 AWS response streaming経路

status：`confirmed` for local source。

REST API、AWS proxy、`ResponseTransferMode.STREAM`、Node.js 24、`streamifyResponse`はAWS公式方式と一致する。

### F-STREAM-003 current deployの逐次表示

status：`confirmed` for current deploy。

2026年8月21日のBrowser E2Eで、最終回答の完了前にassistant本文が増加した。

API Gateway access logでも`timeToFirstContent=10047`、`integrationLatency=52653`を確認し、最初の本文がintegration完了より42,606ms早く到着した。

### F-STREAM-004 独自SSE三eventの必要性

status：`disproved`。

Browserへ必要なのはtextだけであり、複数data typeを多重化する要件がない。

### F-STREAM-005 simple text streamの適合性

status：`confirmed` for design。

AWSはstream payload形式を限定せず、AI SDKはtext-only用途にplain UTF-8 text streamを提供する。

### F-STREAM-006 stream errorのBrowser伝播

status：`unknown` for actual mid-stream failure。

Node.jsのstream errorをAPI Gateway経由のBrowser readerが確実にrejectすることは公式文書だけでは閉じない。reject時は固定文へ置換し、正常EOFなら受信済みtextを保持する。

### F-STREAM-007 独自protocol型

status：`not required`。

raw text方式ではBrowser向けstream event unionとZod schemaを削除できる。

### F-STREAM-008 pre-stream error境界

status：`confirmed` for local source。

現在はUUID、Bearer、Harness stream確立をresponse開始前に行うため、入力不正は400、連携開始失敗は502にできる。

### F-STREAM-009 streaming observability

status：`confirmed` for current deploy。

stream専用access log変数を追加し、対象requestで`responseTransferMode=STREAM`、`timeToAllHeaders=10046`、`timeToFirstContent=10047`、`integrationLatency=52653`を確認した。

## 12. 選択肢

| Option | 内容 | 評価 |
|---|---|---|
| A | raw UTF-8 text response stream | 現在要件に合う最小方式。採用を推奨 |
| B | 現在の独自SSE `delta`、`done`、`error` | structured data要件がなく過剰。不採用を推奨 |
| C | AWS Harness event unionをBrowserへ公開 | AWS内部contractとtool、reasoningを漏らす。不採用を推奨 |
| D | 外部のrich data stream protocolを導入 | 現在使わない機能が多い。不採用を推奨 |

選択はOption Aである。

理由は、Browserが必要とする唯一の値であるtextを、AWS response streamingとWeb `ReadableStream`で直接渡せるためである。

既存protocolの維持と移行は考慮しない。

## 13. 実装後の検証gate案

1. response headerは`Content-Type: text/plain; charset=utf-8`である。
2. 二つ以上のHarness text deltaが、一つのHTTP応答の完了前にBrowserへ届く。
3. UTF-8文字がnetwork chunk境界で分割されても復元される。
4. Harnessの`end_turn`後に正常EOFとなる。
5. `end_turn`以外では正常EOFにしない。
6. stream開始前の入力不正はJSON 400となる。
7. stream開始前のintegration失敗はJSON 502となる。
8. stream開始後の失敗がBrowser readerへ伝播した場合、UIが部分回答を安全な固定文へ置換する。正常EOFなら受信済みtextを保持する。
9. response bodyにSSE field、JSON event、AWS内部payloadを含めない。
10. `timeToFirstContent`またはBrowser時刻で、最初のcontentが全応答完了より前に届くことを示す。

Browser E2Eは利用者の明示指示に基づき実施し、全項目を確認した。

## 14. 実装・配備・E2E実測

### 14.1 実装結果

- BFFの成功応答を`text/plain; charset=utf-8`へ変更した。
- Harnessの`contentBlockDelta.delta.text`だけを`Readable.from`と`pipeline`で転送する。
- `messageStop.stopReason === "end_turn"`だけを正常完了とする。
- BrowserはFetch API、`ReadableStreamDefaultReader`、`TextDecoder`だけで回答を追記する。
- Browser向けの独自event union、Zod schema、SSE parser、frame encoderを削除した。
- 質問本文のZod schemaは唯一の利用箇所であるBFF handlerへ直接置き、専用contractファイルを作らない。
- Lambdaの環境変数は`process.env`ではなく`$amplify/env/agentcore-bff`から取得する。

### 14.2 静的検証

次を2026年8月21日に実行し、すべて成功した。

- `@workops-suite/shared-backend` build。
- `@workops-suite/portal` build。
- `@workops-suite/request-manager` build。
- `@workops-suite/asset-catalog` build。
- `git diff --check`。
- source検索によるSSE contract残存なしの確認。

Frontend三アプリには既存のbundle size警告があるが、build errorではない。

### 14.3 sandbox配備

対象profileとregionを明示し、既存sandboxへ一回配備した。

2026年8月21日17時19分38秒にCloudFormation stack全体が`UPDATE_COMPLETE`となり、sandbox commandはexit code 0で完了した。

### 14.4 Browser E2E

対象は`http://localhost:5175`で、`playwright_multi`だけを使用した。

E2E専用sessionで1200文字以上の日本語回答を要求し、次を確認した。

- 回答完了前に「春」の冒頭だけが表示され、assistant本文が逐次増加した。
- 最終的に春、夏、秋、冬、全体のまとめまで完結した。
- 日本語の文字化けはなかった。
- 画面本文に`delta`、`done`、`error`、`event:`、`data:`は表示されなかった。
- POSTはHTTP 200だった。
- responseの`Content-Type`は`text/plain; charset=utf-8`だった。
- response bodyはassistant回答のMarkdown textだけだった。
- Browser console errorは0件だった。
- E2E sessionはIDを照合してUIから削除し、DELETE 200を確認した。

Access logの実測値は次のとおりだった。

| 項目 | 実測値 |
|---|---:|
| `responseTransferMode` | `STREAM` |
| `timeToAllHeaders` | 10,046ms |
| `timeToFirstContent` | 10,047ms |
| `integrationLatency` | 52,653ms |
| `responseLength` | 5,744 bytes |

最初の本文はintegration完了より42,606ms早く到着した。

対象時間帯のBFF logは16件中ERROR 0件、対象sessionのHarness logは44件中ERROR 0件だった。

### 14.5 E2E証跡

証跡はGit管理外の`tmp/playwright-evidence/`配下へ保存し、repositoryへ含めていない。

動画`raw-text-stream.webm`の検証結果は次のとおりである。

- file size：2,733,121 bytes。
- container：Matroska/WebM。
- video codec：VP8。
- resolution：1440×900。
- frame rate：25fps。
- duration：128.44秒。
- SHA-256を計算し、録画後の同一性を確認した。

FFmpegで代表frameを抽出し、質問送信、回答途中、回答表示、session削除後を目視確認した。

### 14.6 Playwright Extension配布状況

Chrome Web Storeの公式Playwright Extensionは2026年8月21日の確認時点でversion 0.3.0、最終更新日は2026年8月6日だった。

複数client接続対応の公式PRは2026年8月15日にmainへmergeされている。

Store版の更新日がmerge日より前であるため、複数接続対応を含むStore版の配布は確認できなかった。

## 15. 一次資料

- [API Gateway response streamingの用途と制約](https://docs.aws.amazon.com/apigateway/latest/developerguide/response-transfer-mode.html)
- [API Gateway Lambda proxy response streaming形式](https://docs.aws.amazon.com/apigateway/latest/developerguide/response-transfer-mode-lambda.html)
- [Lambda response streaming handler](https://docs.aws.amazon.com/lambda/latest/dg/config-rs-write-functions.html)
- [API Gateway response streamingのtroubleshootingとaccess log変数](https://docs.aws.amazon.com/apigateway/latest/developerguide/response-streaming-troubleshoot.html)
- [AgentCore InvokeHarnessStreamOutput](https://docs.aws.amazon.com/bedrock-agentcore/latest/APIReference/API_InvokeHarnessStreamOutput.html)
- [AgentCore HarnessContentBlockDelta](https://docs.aws.amazon.com/bedrock-agentcore/latest/APIReference/API_HarnessContentBlockDelta.html)
- [AgentCore HarnessMessageStopEvent](https://docs.aws.amazon.com/bedrock-agentcore/latest/APIReference/API_HarnessMessageStopEvent.html)
- [WHATWG HTML Server-sent events](https://html.spec.whatwg.org/multipage/server-sent-events.html)
- [AI SDK text streamとdata stream](https://ai-sdk.dev/docs/ai-sdk-ui/stream-protocol)
- [AI SDK streamText](https://ai-sdk.dev/docs/reference/ai-sdk-core/stream-text)
- [AI SDK stream error handling](https://ai-sdk.dev/docs/ai-sdk-core/error-handling)
- [OpenAI Responses streaming events](https://platform.openai.com/docs/api-reference/responses-streaming)
- [Anthropic streaming messages](https://platform.claude.com/docs/en/build-with-claude/streaming)
- [Playwright Extension Chrome Web Store](https://chromewebstore.google.com/detail/playwright-extension/mmlmfjhmonkocbjadbfplnigmagldckm)
- [Playwright Extension複数client接続対応PR](https://github.com/microsoft/playwright/pull/42259)

## 16. Local evidence

- `packages/shared-backend/amplify/agent-api/resource.ts`
- `packages/shared-backend/amplify/function/agentcore-bff/handler.ts`
- `packages/shared-backend/amplify/function/agentcore-bff/managed-memory.ts`
- `packages/shared-chatbot/src/hooks/useChatBot.ts`
- `packages/shared-chatbot/src/hooks/useSessions.ts`
- `packages/shared-auth/src/AuthProvider.tsx`
- `packages/shared-backend/package.json`
- `node_modules/@aws-sdk/client-bedrock-agentcore/dist-types/models/models_0.d.ts`
- `node_modules/aws-cdk-lib/aws-apigateway/lib/integration.d.ts`
- `node_modules/aws-cdk-lib/aws-apigateway/lib/access-log.js`
