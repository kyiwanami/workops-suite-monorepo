import logging
import os
from datetime import datetime, timezone

import boto3

logger = logging.getLogger(__name__)

REGION = os.environ.get("AWS_REGION", "ap-northeast-1")


class MemoryManager:
    def __init__(self, memory_id: str) -> None:
        self.memory_id = memory_id
        self.client = boto3.client("bedrock-agentcore", region_name=REGION)

    def save_conversation(self, actor_id: str, session_id: str, user_message: str, agent_response: str) -> None:
        try:
            self.client.create_event(
                memoryId=self.memory_id,
                actorId=actor_id,
                sessionId=session_id,
                eventTimestamp=datetime.now(timezone.utc).isoformat(),
                payload=[
                    {"conversational": {"content": {"text": user_message}, "role": "USER"}},
                    {"conversational": {"content": {"text": agent_response}, "role": "ASSISTANT"}},
                ],
            )
            logger.info("Memory event saved for actor=%s session=%s", actor_id, session_id)
        except Exception as e:
            logger.error("Failed to save memory event: %s", e)

    def list_events(self, session_id: str, actor_id: str, max_results: int = 20) -> list:
        try:
            response = self.client.list_events(
                memoryId=self.memory_id,
                sessionId=session_id,
                actorId=actor_id,
                maxResults=max_results,
                includePayloads=True,
            )
            return response.get("events", [])
        except Exception as e:
            logger.error("Failed to list memory events: %s", e)
            return []

    def retrieve_memory_records(self, actor_id: str, session_id: str, query: str, max_results: int = 10) -> list:
        namespaces = [
            f"/app/semantic/actors/{actor_id}",
            f"/app/preference/actors/{actor_id}",
            f"/app/summarization/actors/{actor_id}/sessions/{session_id}",
        ]
        results = []
        per_ns = max(1, max_results // len(namespaces))
        for namespace in namespaces:
            try:
                response = self.client.retrieve_memory_records(
                    memoryId=self.memory_id,
                    namespace=namespace,
                    searchCriteria={"searchQuery": query, "topK": per_ns},
                )
                results.extend(response.get("memoryRecordSummaries", []))
            except Exception as e:
                logger.warning("Failed to retrieve memory records for namespace %s: %s", namespace, e)
        return results

    def build_conversation_context(self, session_id: str, actor_id: str, current_query: str) -> dict:
        recent_events = self.list_events(session_id, actor_id)
        relevant_memories = self.retrieve_memory_records(actor_id, session_id, current_query)
        return {"recentEvents": recent_events, "relevantMemories": relevant_memories}
