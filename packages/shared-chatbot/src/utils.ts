import type { TraceStep, KbChunk, BedrockMessage } from "./types";

// トレース処理ロジック
export function processTraces(
  rawTraces: string | number | true | object | unknown[],
): TraceStep[] {
  // 生トレースデータを表示用に構造化
  const structuredTraces: TraceStep[] = [];
  const toolUseMap = new Map<string, string>(); // ID -> Name

  // すでに配列として渡された場合はそれを使用、文字列の場合はパースする
  // FIXME: askTodoBotを廃止すれば、必ず配列として受け取れる
  let parsedTraces: BedrockMessage[] = [];
  if (Array.isArray(rawTraces)) {
    parsedTraces = rawTraces as BedrockMessage[];
  } else if (typeof rawTraces === "string") {
    try {
      parsedTraces = JSON.parse(rawTraces) as BedrockMessage[];
    } catch (e) {
      console.error("Trace parse error", e);
      return [];
    }
  } else {
    return [];
  }

  parsedTraces.forEach((trace) => {
    trace.content?.forEach((block) => {
      if (
        "toolUse" in block &&
        block.toolUse?.toolUseId &&
        block.toolUse.name
      ) {
        toolUseMap.set(block.toolUse.toolUseId, block.toolUse.name);
      }
    });
  });

  // 構造化データへの変換
  parsedTraces.forEach((trace) => {
    const step: TraceStep = {
      role: trace.role === "user" ? "user" : "assistant",
      text: undefined,
      toolCalls: [],
      toolResults: [],
    };

    trace.content?.forEach((block) => {
      // テキスト
      if ("text" in block && block.text) {
        step.text = block.text;
      }

      // Tool Call
      if (
        "toolUse" in block &&
        block.toolUse &&
        block.toolUse.toolUseId &&
        block.toolUse.name
      ) {
        step.toolCalls.push({
          toolUseId: block.toolUse.toolUseId,
          name: block.toolUse.name,
          input: (block.toolUse.input ?? {}) as Record<
            string,
            string | number | boolean
          >,
        });
      }

      // Tool Result
      if (
        "toolResult" in block &&
        block.toolResult &&
        block.toolResult.toolUseId
      ) {
        const toolUseId = block.toolResult.toolUseId;
        const toolName = toolUseMap.get(toolUseId);

        // toolNameが取得できない場合はスキップ
        if (!toolName) {
          return;
        }

        const content = block.toolResult.content?.[0];

        let kbChunks: KbChunk[] | undefined = undefined;

        // KB検索結果の抽出
        if (toolName === "search-todos" && content && "json" in content) {
          const json = content.json as { results?: KbChunk[] };
          if (Array.isArray(json.results)) {
            kbChunks = json.results;
          }
        }

        step.toolResults.push({
          toolUseId,
          toolName,
          status: block.toolResult.status ?? "success",
          kbChunks,
        });
      }
    });

    structuredTraces.push(step);
  });

  return structuredTraces;
}
