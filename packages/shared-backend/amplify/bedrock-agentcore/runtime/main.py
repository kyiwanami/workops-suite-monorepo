import json
import logging
import os

import boto3
from bedrock_agentcore import AgentCoreApp

from memory_manager import MemoryManager
from mcp_client import McpClient
from prompts import build_system_prompt

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")

app = AgentCoreApp()

MODEL_ID = "jp.anthropic.claude-sonnet-4-6"
MAX_TOOL_ITERATIONS = 10


@app.entrypoint
def invoke(payload: dict, context) -> dict:
    query: str = payload["query"]
    session_id: str = payload["sessionId"]
    actor_id: str = payload["actorId"]
    auth_header: str = context.authorization
    attachments: list = payload.get("attachments", [])

    if not query or not query.strip():
        raise ValueError("query is required")

    if not auth_header:
        raise ValueError("Authorization header is required")

    logger.info("Invoking agent", extra={"sessionId": session_id, "actorId": actor_id, "queryLength": len(query)})

    memory_id = os.environ["AGENTCORE_MEMORY_ID"]
    gateway_url = os.environ["AGENTCORE_GATEWAY_URL"]

    memory_manager = MemoryManager(memory_id)
    memory_context = memory_manager.build_conversation_context(session_id, actor_id, query)

    mcp = McpClient(gateway_url, auth_header)
    bedrock_tools = mcp.list_tools()

    logger.info("Initialized tools from Gateway", extra={"count": len(bedrock_tools)})

    bedrock = boto3.client("bedrock-runtime")

    # 初期メッセージ（添付ファイル対応）
    initial_content = [{"text": query}]
    for att in attachments:
        ext = att["name"].rsplit(".", 1)[-1].lower() if "." in att["name"] else ""
        import base64
        import uuid
        initial_content.append({
            "document": {
                "name": f"f{uuid.uuid4().hex}",
                "format": ext,
                "source": {"bytes": base64.b64decode(att["base64"])},
            }
        })

    messages = [{"role": "user", "content": initial_content}]

    for iteration in range(MAX_TOOL_ITERATIONS):
        logger.info("Converse API iteration", extra={"iteration": iteration + 1, "messageCount": len(messages)})

        response = bedrock.converse(
            modelId=MODEL_ID,
            messages=messages,
            system=[{"text": build_system_prompt(memory_context)}],
            toolConfig={"tools": bedrock_tools},
            inferenceConfig={"maxTokens": 2048, "temperature": 0.1},
        )

        stop_reason = response["stopReason"]
        message = response["output"]["message"]
        messages.append(message)

        logger.info("Converse response", extra={"stopReason": stop_reason, "contentCount": len(message["content"])})

        if stop_reason == "end_turn":
            answer = next(
                (b["text"] for b in message["content"] if "text" in b),
                "回答を生成できませんでした",
            )
            logger.info("Agent response generated", extra={"sessionId": session_id, "answerLength": len(answer), "iterations": iteration + 1})

            try:
                memory_manager.save_conversation(actor_id, session_id, query, answer)
            except Exception as e:
                logger.error("Failed to save conversation to memory: %s", e)

            return {"answer": answer, "sessionId": session_id}

        if stop_reason == "tool_use":
            tool_results = []
            for block in message["content"]:
                if "toolUse" not in block:
                    continue
                tu = block["toolUse"]
                tool_name = tu["name"]
                tool_input = tu.get("input", {})
                tool_use_id = tu["toolUseId"]

                logger.info("Executing tool", extra={"toolName": tool_name, "toolInput": tool_input})

                try:
                    result = mcp.call_tool(tool_name, tool_input)
                    tool_results.append({
                        "toolResult": {
                            "toolUseId": tool_use_id,
                            "content": result,
                            "status": "success",
                        }
                    })
                except Exception as e:
                    logger.error("Tool execution error for %s: %s", tool_name, e)
                    tool_results.append({
                        "toolResult": {
                            "toolUseId": tool_use_id,
                            "content": [{"text": f"Error: {e}"}],
                            "status": "error",
                        }
                    })

            messages.append({"role": "user", "content": tool_results})
            continue

        # max_tokens, content_filtered など
        logger.warning("Unexpected stop reason: %s", stop_reason)
        answer = next((b["text"] for b in message["content"] if "text" in b), f"応答が途中で終了しました（{stop_reason}）")
        return {"answer": answer, "sessionId": session_id}

    raise RuntimeError(f"Tool calling loop exceeded maximum iterations ({MAX_TOOL_ITERATIONS})")


if __name__ == "__main__":
    app.run()
