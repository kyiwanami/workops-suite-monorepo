import type { MemoryContext } from "./types.js";

const dateFormatter = new Intl.DateTimeFormat("ja-JP", {
  timeZone: "Asia/Tokyo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});

export const buildSystemPrompt = (memoryContext: MemoryContext): string => {
  const historyLines: string[] = [];
  for (const event of memoryContext.recentEvents) {
    const payload = event.payload;
    if (payload === undefined) {
      continue;
    }

    for (const item of payload) {
      const conv = item.conversational;
      if (conv === undefined) {
        continue;
      }

      const text = conv.content?.text;
      if (text === undefined || text.length === 0) {
        continue;
      }

      const role = conv.role === "USER" ? "ユーザー" : "アシスタント";
      historyLines.push(`${role}: ${text}`);
    }
  }

  const memoryLines: string[] = [];
  for (const memory of memoryContext.relevantMemories) {
    const text = memory.content?.text;
    if (text === undefined || text.length === 0) {
      continue;
    }
    memoryLines.push(`- ${text}`);
  }

  const parts = [
    "あなたは、ユーザーの質問に答えるアシスタントです。質問に答える際には、以下の情報を活用してください。\n",
  ];

  if (historyLines.length > 0) {
    parts.push(`[過去の会話履歴]\n${historyLines.join("\n")}\n`);
  }

  if (memoryLines.length > 0) {
    parts.push(`[Knowledge Base検索結果 / 関連する記憶]\n${memoryLines.join("\n")}\n`);
  }

  parts.push("ツール実行時にエラーが発生した場合は、デバッグのためエラーの詳細（エラーコードやメッセージ）をそのままユーザーに伝えてください。\n");
  parts.push(`現在時刻: ${dateFormatter.format(new Date())}`);

  return parts.join("\n");
};
