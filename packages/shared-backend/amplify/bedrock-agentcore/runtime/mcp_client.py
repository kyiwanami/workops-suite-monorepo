import json
import logging
import os
import re
from typing import Any

from mcp import ClientSession
from mcp.client.streamable_http import streamablehttp_client

logger = logging.getLogger(__name__)

GOOGLE_CUSTOM_SEARCH_CX = os.environ.get("GOOGLE_CUSTOM_SEARCH_CX", "")
BROWSER_IDENTIFIER = os.environ.get("BROWSER_IDENTIFIER", "")
AWS_REGION = os.environ.get("AWS_REGION", "ap-northeast-1")


class McpClient:
    """AgentCore MCP Gateway クライアント。

    tool呼び出しごとに新規セッションを確立する（mcp Python SDKの制約に対応）。
    """

    def __init__(self, gateway_url: str, auth_header: str) -> None:
        self.gateway_url = gateway_url
        self.auth_header = auth_header
        # ショート名 → フルネーム のマッピング
        self._tool_mapping: dict[str, str] = {}

    def _headers(self) -> dict[str, str]:
        return {"Authorization": self.auth_header}

    def list_tools(self) -> list[dict]:
        """ツール一覧を取得し Bedrock toolConfig 形式で返す。"""
        import asyncio
        return asyncio.run(self._list_tools_async())

    async def _list_tools_async(self) -> list[dict]:
        async with streamablehttp_client(self.gateway_url, headers=self._headers()) as (read, write, _):
            async with ClientSession(read, write) as session:
                await session.initialize()
                result = await session.list_tools()

        self._tool_mapping.clear()
        bedrock_tools = []
        for tool in result.tools:
            # ショート名の正規化（TypeScript版と同一ロジック）
            match = re.search(r"(?:.+)_{2,3}(.+)", tool.name)
            short_name = match.group(1) if match else tool.name
            self._tool_mapping[short_name] = tool.name

            bedrock_tools.append({
                "toolSpec": {
                    "name": short_name,
                    "description": tool.description or "",
                    "inputSchema": {"json": tool.inputSchema if hasattr(tool, "inputSchema") else {}},
                }
            })

        logger.info("listTools: %d tools fetched", len(bedrock_tools))
        return bedrock_tools

    def call_tool(self, name: str, args: dict[str, Any] | None = None) -> list[dict]:
        """ツールを実行し、Bedrock toolResult.content 形式で返す。"""
        import asyncio
        return asyncio.run(self._call_tool_async(name, args or {}))

    async def _call_tool_async(self, name: str, args: dict[str, Any]) -> list[dict]:
        actual_name = self._tool_mapping.get(name)
        if not actual_name:
            raise ValueError(f"Unknown tool: {name}")

        # fetch_web_info は Browser Tool 経由で実行
        if name == "fetch_web_info":
            url = args.get("url")
            if not url:
                raise ValueError("fetch_web_info requires a valid URL")
            return await self._execute_browser_tool(url)

        # web-search に cx を追加
        if name == "web-search" and GOOGLE_CUSTOM_SEARCH_CX:
            args = {**args, "cx": GOOGLE_CUSTOM_SEARCH_CX}

        logger.info("Calling tool via MCP: %s -> %s", name, actual_name)

        async with streamablehttp_client(self.gateway_url, headers=self._headers()) as (read, write, _):
            async with ClientSession(read, write) as session:
                await session.initialize()
                result = await session.call_tool(actual_name, args)

        if result.isError:
            error_msg = f"Tool execution returned error: {result.content}"
            logger.error(error_msg)
            raise RuntimeError(error_msg)

        # MCP content → Bedrock toolResult.content 形式に変換
        bedrock_content = []
        for content in result.content:
            if content.type == "text":
                try:
                    parsed = json.loads(content.text)
                    bedrock_content.append({"json": parsed})
                except json.JSONDecodeError:
                    bedrock_content.append({"text": content.text})
            else:
                bedrock_content.append({"text": str(content)})

        return bedrock_content

    async def _execute_browser_tool(self, url: str) -> list[dict]:
        """AgentCore Browser Tool でページコンテンツを取得。"""
        from bedrock_agentcore.browser.playwright import PlaywrightBrowser

        browser = PlaywrightBrowser(region=AWS_REGION, identifier=BROWSER_IDENTIFIER)
        try:
            await browser.navigate(url=url, waitUntil="networkidle", timeout=30000)
            page_content = await browser.getText(selector="body")
            logger.info("Browser Tool execution successful, contentLength=%d", len(page_content or ""))
            await browser.stopSession()
            return [{"text": f"URL: {url}\n\nPage Content:\n{page_content or 'No content found'}"}]
        except Exception as e:
            logger.error("Browser Tool execution failed: %s", e)
            try:
                await browser.stopSession()
            except Exception:
                pass
            raise
