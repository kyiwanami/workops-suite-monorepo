from datetime import datetime, timezone


def build_system_prompt(memory_context: dict) -> str:
    """チャット用システムプロンプト構築。"""
    now = datetime.now(timezone.utc).astimezone(
        __import__("zoneinfo").ZoneInfo("Asia/Tokyo")
    ).strftime("%Y/%m/%d %H:%M:%S")

    recent_events: list = memory_context.get("recentEvents", [])
    relevant_memories: list = memory_context.get("relevantMemories", [])

    # 過去の会話履歴
    history_lines = []
    for event in recent_events:
        for payload in event.get("payload", []):
            conv = payload.get("conversational")
            if not conv:
                continue
            role = "ユーザー" if conv.get("role") == "USER" else "アシスタント"
            text = (conv.get("content") or {}).get("text", "")
            if text:
                history_lines.append(f"{role}: {text}")
    conversation_history = "\n".join(history_lines)

    # 関連する長期記憶
    memory_lines = []
    for memory in relevant_memories:
        text = (memory.get("content") or {}).get("text", "")
        if text:
            memory_lines.append(f"- {text}")
    memories = "\n".join(memory_lines)

    parts = ["あなたは、ユーザーの質問に答えるアシスタントです。質問に答える際には、以下の情報を活用してください。\n"]

    if conversation_history:
        parts.append(f"[過去の会話履歴]\n{conversation_history}\n")

    if memories:
        parts.append(f"[Knowledge Base検索結果 / 関連する記憶]\n{memories}\n")

    parts.append("ツール実行時にエラーが発生した場合は、デバッグのためエラーの詳細（エラーコードやメッセージ）をそのままユーザーに伝えてください。\n")
    parts.append(f"現在時刻: {now}")

    return "\n".join(parts)
