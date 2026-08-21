# AgentCore調査結果索引

作成日：2026-08-21。

## 1. 目的

本書は、AgentCore構成について同じ調査を再実施しないための索引である。

調査結果そのものの詳細は別冊01から04とAgDRに置き、本書では次の六点を一意に引けるようにする。

1. 何を確認したか。
2. 結果は何か。
3. どの条件まで有効か。
4. 何をまだ確認していないか。
5. どの変化が起きたら再調査できるか。
6. 詳細証拠はどこにあるか。

## 2. 読み方

新しい調査を始める前に、調査質問を一文にし、本書のClaimと照合する。

一致するClaimがあり、その無効化条件が成立していない場合は、同じWeb検索、image取得、SDK spike、AWS API、sandbox、Browser E2Eを再実行しない。

一致するClaimがない場合でも、近いClaimの「適用範囲外」であることを先に説明する。

## 3. status

| status | 意味 | 次にできること |
|---|---|---|
| `confirmed` | 記載した条件で、公式明文、source、実AWS、またはE2Eにより直接確認した | 無効化条件が成立するまで再調査しない |
| `disproved` | 記載した条件で期待した挙動が成立しなかった | 同じ条件の再試行をしない |
| `historical` | 過去の特定version、digest、account、構成だけで確認した | 現在へ一般化せず、条件が変わった場合だけ差分確認する |
| `unknown` | 公式surfaceまたは実行証拠が不足している | 推測実装せず、必要性と最小確認手段を決める |
| `deferred` | 最終要求には含むが、現在方式では意図的に実装していない | AgDRの解除条件がすべて揃った場合だけ着手する |
| `user-rejected` | ユーザーの明示制約に反する | ユーザーが制約を変更しない限り候補へ戻さない |

## 4. 公式契約の結果

| Claim | 調査質問 | 結果 | status | 適用範囲 | 再調査条件 | 詳細 |
|---|---|---|---|---|---|---|
| `F-OFFICIAL-HARNESS-001` | Harnessは利用者Bearerを受け取れるか | CUSTOM_JWT inboundを構成できる | `confirmed` | AWS公開Harness security/API契約 | authorizer schemaまたはSDK型の変更 | 別冊01 |
| `F-OFFICIAL-HARNESS-002` | Harnessはagent loopをmanaged側で所有できるか | native toolとMemoryをHarnessが所有できる | `confirmed` | Managed Harnessの公開tool contract | native tool contract変更 | 別冊01 |
| `F-OFFICIAL-GATEWAY-001` | Gatewayは最終認可境界になれるか | Gateway Policy Engineは`ENFORCE`でtarget前に判定できる | `confirmed` | GatewayとPolicy Engineの公開契約 | Policy接続modeまたはauthorization event変更 | 別冊01、AgDR-0001 |
| `F-OFFICIAL-GATEWAY-002` | `allowedTools`は認可境界か | LLMへ見せるtool候補の制限であり、最終認可ではない | `confirmed` | Harness tool selection | AWSが明示的にsecurity boundaryへ変更 | 別冊01、別冊03 M-001 |
| `F-OFFICIAL-GATEWAY-003` | `tools/list`と`tools/call`の役割は同じか | listは公開可能tool、callは具体的入力を含む再認可である | `confirmed` | Gateway MCP/Policy Engine | protocolまたはPolicy integration変更 | 別冊01 |
| `F-OFFICIAL-IDENTITY-001` | AgentCore IdentityはAuthorization Codeを提供するか | OAuth provider、callback、token vaultのprimitiveは存在する | `confirmed` | Identity公開API | API廃止またはreplacement | 別冊01 |
| `F-OFFICIAL-IDENTITY-002` | primitiveだけでHarness 3LO E2Eが保証されるか | 保証されない。authorization URL通知、session binding、resume surfaceを別途確認する必要がある | `confirmed` | 現行公開APIとSDK型 | Harnessが一体契約を公式公開 | 別冊01、別冊03 OAUTH-F03/F04 |
| `F-OFFICIAL-MCP-001` | Gatewayが受理できるMCP revisionは何か | 公式対応版とManaged Harnessが実際に交渉できる版は別に確認する | `confirmed` | Gateway supportedVersionsとmanaged client | 対応revisionまたはHarness image変更 | 別冊01、AgDR-0003 |
| `F-OFFICIAL-OBS-001` | Cedar判定をAWS標準で観測できるか | Transaction Search、`aws/spans`、Gateway `TRACES` delivery、Policy spanを使う | `confirmed` | CloudWatch/X-Ray/AgentCore observability | fieldまたはdelivery contract変更 | 別冊01、AgDR-0004 |
| `F-OFFICIAL-RUNTIME-001` | Custom RuntimeをBrowserから直接使えるか | Bearer HTTPS、session、streamは公開されるが、CORS、event DTO、履歴UIをapplicationが所有する | `confirmed` | Custom Runtime公開契約 | Browser向け統合契約が新設 | 別冊01、別冊03 M-012/M-013 |

## 5. 現在実装の結果

| Claim | 調査質問 | 結果 | status | 適用範囲 | 再調査条件 | 詳細 |
|---|---|---|---|---|---|---|
| `F-LOCAL-001` | BFFはagent loopまたはMCPを所有するか | 所有しない。Bearer付き`InvokeHarness`一回とresponse relayだけを持つ | `confirmed` | 現在の`agentcore-bff` source | BFF handler変更 | 別冊02 |
| `F-LOCAL-002` | Harnessは何を所有するか | CUSTOM_JWT inbound、native `agentcore_gateway`一件、AWS_IAM outbound、Memoryを所有する | `confirmed` | 現在のHarness construct | Harness construct変更 | 別冊02 |
| `F-LOCAL-003` | Gatewayの認証・MCP・Policy modeは何か | AWS_IAM、`2025-11-25`単独、`ENFORCE` | `confirmed` | 現在のGateway construct | Gateway construct変更 | 別冊02、AgDR-0003 |
| `F-LOCAL-004` | Cedarは誰に何を許可するか | exact Harness assumed-role principalへViewer read-only八toolだけをpermitする | `confirmed` | 現在のPolicy source | role ARN、tool set、policy生成変更 | 別冊02、AgDR-0002 |
| `F-LOCAL-005` | 現在許可するtool集合はどこにあるか | `allowedToolNames`のread-only八toolだけをPolicy化し、将来用role mapは持たない | `confirmed` | 現在source | tool集合またはPolicy生成変更 | 別冊02、AgDR-0002 |
| `F-LOCAL-006` | Frontend/BFFに手動pause・toolResult resume・round loopがあるか | ない | `confirmed` | 現在source | BFF、Harness tool定義変更 | AgDR-0001、別冊02 |
| `F-LOCAL-007` | repositoryにtest/spec fileを保持するか | ユーザー判断により保持しない | `confirmed` | 現在repository | ユーザー判断変更 | 別冊02、別冊04 |
| `F-LOCAL-008` | Portalへ登録したApp URLはCognitoへ自動追記されるか | 方針はApp DynamoDB Streamだが、handler形式、event source、backend登録、IAMが未接続である | `not implemented` | 現在repository | D-APP-02解除条件を満たす実装 | 別冊02、別冊04、AgDR-0005 |

### Browser向けChatストリーミング契約

| Claim | 調査質問 | 結果 | status | 適用範囲 | 再調査条件 | 詳細 |
|---|---|---|---|---|---|---|
| `F-STREAM-001` | ストリーミング要件は正本へ記載されているか | text deltaの逐次中継と非buffer検証は記載済みだが、SSEが必要かの比較がなかった | `confirmed` | AgDR-0005、別冊02、別冊04 | 要求または正本文書変更 | 別冊06 |
| `F-STREAM-002` | local sourceはAWS公式のresponse streaming経路か | REST API、AWS proxy、`ResponseTransferMode.STREAM`、Node.js 24、`streamifyResponse`を使う | `confirmed` | 現在sourceと導入済みCDK `2.265.0` | Agent API、BFF runtime、CDK変更 | 別冊06 |
| `F-STREAM-003` | 現在deploy済みsourceでBrowserが逐次表示するか | raw text版をsandboxへ配備し、Browserで逐次表示を確認した | `confirmed` | 検証時sandbox | streaming経路またはBrowser実装変更 | 別冊06 |
| `F-STREAM-004` | 独自SSE三eventは必要か | Browserへ必要なのはtextだけで、複数data typeを多重化する要件がない | `disproved` | 現在のChat UI要件 | Browserへstructured dataを追加 | 別冊06 |
| `F-STREAM-005` | raw UTF-8 text streamは適合するか | AWSはpayload形式を限定せず、AI SDKはtext-only用途にplain text streamを提供する | `confirmed` | text-only Chat response | Browserへstructured dataを追加 | 別冊06 |
| `F-STREAM-006` | API Gateway経由でstream errorがBrowserへ伝播するか | 公式文書だけではBrowser readerの挙動まで閉じない。readerがrejectすれば固定文へ置換し、正常EOFなら受信済みtextを保持する | `unknown` | Regional REST APIとLambda response streaming | 実際の途中障害を観測 | 別冊06 |
| `F-STREAM-007` | Browser向け独自protocol型は必要か | raw text方式ではevent union、Zod schema、SSE parserを削除できる | `not required` | text-only Chat response | Browserへstructured dataを追加 | 別冊06 |
| `F-STREAM-008` | pre-stream failureはHTTP JSON errorになるか | UUID、Bearer、Harness stream確立をHTTP 200開始前に行い、入力不正は400、連携開始失敗は502にできる | `confirmed` | 現在のBFF handler | response開始順序変更 | 別冊06 |
| `F-STREAM-009` | 非bufferをstream専用指標で観測できるか | access logへstream専用項目を追加し、`STREAM`と本文先着を実測した | `confirmed` | 検証時sandboxのAgent REST API | streaming経路またはaccess log変更 | 別冊06 |

## 6. 実AWSとE2Eの結果

| Claim | 調査質問 | 結果 | status | 適用範囲 | 再調査条件 | 詳細 |
|---|---|---|---|---|---|---|
| `F-AWS-001` | 現在の検証対象はどれか | 対象profileとregionを明示した保持sandbox | `confirmed` | 2026-08-21検証環境 | account、region、identifier変更 | 別冊02 |
| `F-AWS-002` | Cognito domainはどのresourceか | 対象sandboxのUser Pool、app client、domainをcontrol planeで照合した | `confirmed` | 現在sandbox | auth resource replacement | 別冊02 |
| `F-AWS-003` | Harness/Gateway/PolicyはREADYか | HarnessとGatewayはREADY、Policy EngineはENFORCE、PolicyはACTIVE | `confirmed` | 現在sandbox | stack update/replacement | 別冊02 |
| `F-E2E-001` | 非許可principalはtargetを呼べるか | direct MCP callは`Tool Execution Denied`、対象Lambda未到達 | `confirmed` | 記録済みdeny trace | principal/policy/tool変更 | 別冊02 |
| `F-E2E-002` | Supported UIのreadはnative経路で成功するか | Managed HarnessがMCP `2025-11-25`を交渉し、Cedar ALLOW、Gateway call、Lambda、UI回答まで成功 | `confirmed` | 現在sandboxと記録済みE2E | Harness image、MCP、Policy、target変更 | 別冊02 |
| `F-E2E-003` | Supported UIのwrite拒否はCedar DENY証明か | 現在のViewer公開toolがread-onlyのため、UI write要求だけではCedar DENY証明にならない | `confirmed` | 現在のtool公開範囲 | write tool公開または本人委任導入 | 別冊02、別冊03 M-002 |
| `F-OBS-001` | account/Gateway観測は動作するか | CloudWatchLogs ACTIVE、Transaction Search 1%、`aws/spans`、Gateway TRACESを確認 | `confirmed` | 検証時accountとregion | account設定またはGateway変更 | 別冊02、AgDR-0004 |
| `F-BUILD-001` | 現在sourceはbuildできるか | Asset Catalog、Portal、Request Manager、Shared Backendが成功 | `confirmed` | 現在worktree | source/dependency変更 | 別冊02 |
| `F-CLEANUP-001` | E2E一時資源は残っているか | 一時user、session、tab、local process、失敗stackを対象ごとにcleanup済み | `confirmed` | 記録したresource ID | 新しいE2Eまたはsandbox作成 | 別冊02 |

## 7. 意図的に未実装の結果

| Claim | 最終要求 | 現在の結果 | status | 解除条件 | 正本 |
|---|---|---|---|---|---|
| `D-IDENTITY-01` | 元利用者`sub`をCedar principalにする | exact Harness IAM roleをprincipalにする | `deferred` | 公式user-bound token surface、同一利用者、追加loginなし、representative E2E | AgDR-0002 |
| `D-IDENTITY-02` | JWT role claimでtool権限を分ける | Viewer read-only固定 | `deferred` | Gatewayへ検証可能claimが到達し、Cedar tag mappingを実証 | AgDR-0002 |
| `D-IDENTITY-03` | 更新・削除・承認toolをrole別に許可する | Cedar default deny | `deferred` | D-IDENTITY-01/02と副作用fixtureが成立 | AgDR-0002 |
| `D-IDENTITY-04` | native Authorization Code outbound | AWS_IAM outbound | `deferred` | authorization URL、callback、session、resumeが公式契約化される | AgDR-0002 |
| `D-IDENTITY-05` | JWT前提Gateway interceptor | Gatewayへ関連付けない | `deferred` | Gateway CUSTOM_JWTへの切替と同時に検証 | AgDR-0002 |
| `D-MCP-01` | MCP `2026-07-28` | `2025-11-25`単独 | `deferred` | Managed Harness自身の交渉成功、allow/deny/UI証拠 | AgDR-0003 |
| `D-APP-01` | `list-requests`外部pagination | 内部上限内の全件返却 | `deferred` | UI挙動を変えるユーザー判断とschema/handler同時変更 | AgDR-0005 |

## 8. 反証済みまたは禁止した結果

| Claim | 結果 | status | 適用範囲 | 再検討条件 | 詳細 |
|---|---|---|---|---|---|
| `M-001` | `allowedTools`は最終認可にならない | `confirmed` | Harness tool selection | AWS契約変更 | 別冊03 |
| `M-002` | BFF/Harness先行拒否はCedar DENY証明にならない | `confirmed` | 旧inlineと現在のUI tool公開 | execution path変更 | 別冊03 |
| `M-003` | Policy ACTIVEとGateway `ENFORCE`は別状態である | `confirmed` | Gateway Policy Engine | API/state model変更 | 別冊03 |
| `M-004` | Harness IAM principalは元利用者identityではない | `confirmed` | AWS_IAM outbound | user-bound delegation導入 | 別冊03 |
| `M-005` | v5/v6 OAuth adapter失敗からnative Gateway全体を不可能と一般化できない | `confirmed` | 固定image digest | 新しいimageは差分だけ確認 | 別冊03 |
| `M-006` | Cognito token exchange不在から追加login必須とは断定できない | `confirmed` | 認証方式比較 | 公式identity delegation contract変更 | 別冊03 |
| `M-007` | BFFによるservice-linked token先取りは責務違反である | `confirmed` | Managed Harness構成 | AWSがBFF用公式契約を公開 | 別冊03 |
| `M-008` | 未確認のauthorization URL、callback、session、resume fieldを作らない | `confirmed` | OAuth application contract | 公式型公開 | 別冊03 |
| `M-009` | dirty spikeをclean baselineとして扱わない | `confirmed` | Git/worktree検証 | なし | 別冊03、別冊04 |
| `M-010` | inline MCP bridgeはmanaged-native標準構成ではない | `user-rejected` | WorkOps最終設計 | ユーザー制約変更 | 別冊03 |
| `M-011` | BFF動的`tools/list` bridgeを最終解にしない | `user-rejected` | WorkOps最終設計 | ユーザー制約変更 | 別冊03 |
| `M-012` | Custom Runtime/Strandsを最終候補へ戻さない | `user-rejected` | Managed Harness必須条件 | ユーザー制約変更 | 別冊03 |
| `M-013` | ECR/container運用をCustom Runtime棄却の主要根拠にしない | `confirmed` | 調査時Runtime artifact | Runtime packaging変更 | 別冊03 |
| `M-014` | 2025-11未試行のまま2025-06を最小としない | `confirmed` | MCP互換調査 | revision集合変更 | 別冊03、AgDR-0003 |
| `M-015` | dual advertisementを互換保証とみなさない | `disproved` | 現行Managed Harness image | negotiation実装変更 | 別冊03、AgDR-0003 |
| `M-016` | Cognito domainの所在をprofile/account未確認で断定しない | `confirmed` | AWS resource調査 | なし | 別冊03 |
| `M-017` | identifierだけで全physical nameが分離するとは限らない | `confirmed` | Amplify/CDK構成 | naming source変更 | 別冊03、別冊04 |
| `M-018` | 初回作成契約の欠陥を失敗stackのupdateで直さない | `confirmed` | CloudFormation lifecycle | replacement behavior変更 | 別冊03、別冊04 |
| `M-019` | CedarのSTS assumed-role principalへregionを入れない | `confirmed` | current principal parser | Cedar entity format変更 | 別冊03 |
| `M-020` | ChatWidget所有appを確認せずE2E appを選ばない | `confirmed` | current frontend構成 | route ownership変更 | 別冊03、別冊04 |
| `M-021` | viewportと既知localhost条件を事前確認する | `confirmed` | Browser E2E | UI/layout変更 | 別冊03、別冊04 |
| `M-022` | 同一条件の調査を「念のため」繰り返さない | `confirmed` | 全調査 | 既存Claimの無効化条件成立 | 本書 |

## 9. native OAuthで分離した結果

| Claim | 結果 | status | 適用範囲 | 無効化条件 | 詳細 |
|---|---|---|---|---|---|
| `OAUTH-F01` | BFFがservice-linked Workload Identityを取得する方式はcaller境界が誤り | `confirmed` | 旧BFF prefetch案 | AWSが外部caller向け公式APIを公開 | 別冊03 |
| `OAUTH-F02` | 固定Managed Harness imageではadapterが`resourceOauth2ReturnUrl`を渡さず失敗 | `historical` | 記録済みmanifest/config/file hash | imageまたはfile hash変更 | 別冊03 |
| `OAUTH-F03` | Harnessからauthorization URLを返す公開fieldを確認できない | `unknown` | SDK `3.1112.0`と監査済みimage | SDK/API/image変更 | 別冊01、03 |
| `OAUTH-F04` | callback後に同じHarness interactionをresumeする公開契約を確認できない | `unknown` | SDK `3.1112.0`と監査済みimage | SDK/API/image変更 | 別冊01、03 |

## 10. 再調査の開始条件

### 補助的な実装境界

| Claim | 結果 | status | 再確認条件 | 詳細 |
|---|---|---|---|---|
| `H-IAM-001` | Cedar `LOG_ONLY` | resolved | Policy mode変更 | 別冊03 §16 |
| `H-IAM-002` | AppSync operation権限が必要範囲より広い可能性 | unknown/out-of-scope | ユーザーがData/AppSync認可を明示的に対象化 | 別冊03 §16 |
| `H-IAM-003` | Harness Logs `Resource: *` | resolved | Harness IAM変更 | 別冊03 §16 |
| `H-IAM-004` | Gateway Cedar actionのresource statement未分離 | resolved | Gateway IAM変更 | 別冊03 §16 |
| `H-IAM-005` | Gateway trustのname prefix pattern | current limitation | pre-create exact ARN契約追加 | 別冊03 §16 |
| `H-IAM-006` | Harness trustのAgentCore source pattern | current limitation | pre-create exact ARN契約追加 | 別冊03 §16 |
| `H-IAM-007` | Managed Memory ARN pattern | current E2E confirmed | Harness名またはMemory ARN規則変更 | 別冊03 §16 |
| `H-IAM-008` | Knowledge Base ARNの`arn:aws`固定 | open/out-of-scope | non-`aws` partition展開 | 別冊03 §16 |
| `H-APP-001` | BFF role別tool再検証不足 | not applicable | BFF MCPを再導入する場合 | 別冊03 §16 |
| `H-APP-002` | custom scopeの全auth flow付与未確認 | current E2E path confirmed | clientまたはauth flow変更 | 別冊03 §16 |
| `H-APP-003` | 401 redirect loop | resolved | AuthProvider/401処理変更 | 別冊03 §16 |
| `H-APP-004` | Memory raw fallback | resolved | Memory parser変更 | 別冊03 §16 |
| `H-APP-005` | React Error Boundaryなし | open hardening | ユーザーがUI要件へ追加 | 別冊03 §16 |
| `H-APP-006` | inline resumeでassistant text欠落 | not applicable | manual loop再導入時のみ | 別冊03 §16 |
| `H-APP-007` | stream開始後errorの分類 | open application decision | 認証回復要件追加 | 別冊03 §16 |
| `H-APP-008` | unused Agent Runtime IAM/env | resolved | Runtime invoke再導入 | 別冊03 §16 |
| `H-APP-009` | wildcard CORS | open hardening | production origin制限を要件化 | 別冊03 §16 |

次のいずれかが実際に成立した場合だけ、該当Claimの差分を調査する。

1. AWS公式APIまたはDeveloper Guideが更新された。
2. Managed Harness image digestまたは内部file hashが変わった。
3. `@aws-sdk/client-bedrock-agentcore`の公開型が変わった。
4. Gateway supported MCP revisionが変わった。
5. product sourceまたはIaCが変わった。
6. account、region、identifier、resource physical IDが変わった。
7. ユーザー要求、禁止条件、許容する縮退が変わった。
8. 既存Claimの適用範囲外であることを具体的に示せた。

「時間が経った」「念のため」「前回の結論が不安」は、それだけでは開始条件にならない。

## 11. 調査開始票

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

この票を埋めずに、Web検索、過去thread全文再読、image pull、SDK spike、AWS API、sandbox、Browser E2Eへ進まない。

## 12. 確認手段の順序

調査は次の順で、必要な地点までだけ進める。

1. 本書と別冊01から03の既存Claim。
2. 現在のlocal sourceとSDK公開型。
3. AWS公式文書。
4. read-only AWS control plane。
5. 確証取得だけを目的にした最小SDK/API call。
6. managed componentまたはCloudFormation lifecycleが必要な場合だけsandbox。
7. ユーザーが明示した場合だけBrowser E2E。

上位の手段で質問が閉じた場合、下位の手段へ進まない。

## 13. 証拠の扱い

### 13.1 公式sample

AWS公式文書のJSON例にあるrequest IDとtrace IDはWorkOpsの実行証拠ではない。

公式sampleから保存するのはfield名、意味、取得条件であり、sample値を実AWS結果へ混ぜない。

### 13.2 currentとhistorical

次の値が一つでも異なる証拠を、同じ実行結果として合成しない。

- account。
- region。
- profile。
- identifier。
- resource physical ID。
- image digest。
- SDK version。
- MCP revision。
- Cedar mode。
- timestamp。

### 13.3 実装成功の代用にできない証拠

- SDK型の存在だけでE2E成功としない。
- API一回の成功だけでManaged Harness成功としない。
- CloudFormation `CREATE_COMPLETE`だけでruntime成功としない。
- Policy `ACTIVE`だけでGateway `ENFORCE`としない。
- Policy spanの存在だけでDENY強制としない。
- UIの先行拒否だけでCedar DENYとしない。
- Custom RuntimeのMCP成功をManaged HarnessのMCP成功としない。

## 14. Claim更新規則

新事実が既存Claimと衝突した場合、「重要な事実が発覚した」とだけ記録しない。

必ず次を示す。

1. 衝突するClaim ID。
2. 旧Claimの証拠と適用範囲。
3. 新証拠と適用範囲。
4. AWS変更、環境差、過去調査不足、誤推論のどれか。
5. 影響するAgDR。
6. 実装を停止するか。
7. 旧statusと新status。
8. 新しい無効化条件。
9. 同じ誤りを防ぐ検証gate。

古い結果は、誤りだったのか、当時だけ正しかったのかを区別する。

結果を消して現在値だけへ上書きしない。

時系列が因果関係を説明する場合は、仮定、確認、反証、結論の順で残す。
