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

export const buildSystemPrompt = (): string => {
  const parts = [
    "あなたは、ユーザーの質問に答えるアシスタントです。質問に答える際には、提供された記憶とツールを活用してください。\n",
  ];

  parts.push("ツール実行時にエラーが発生した場合は、デバッグのためエラーの詳細（エラーコードやメッセージ）をそのままユーザーに伝えてください。\n");
  parts.push(`現在時刻: ${dateFormatter.format(new Date())}`);

  return parts.join("\n");
};
