import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import {
  CallToolResultSchema,
  type CallToolResult,
  type Tool as McpTool,
} from "@modelcontextprotocol/sdk/types.js";
import type {
  Tool,
  ToolResultContentBlock,
  ToolUseBlock,
} from "@aws-sdk/client-bedrock-runtime";

type ToolInput = ToolUseBlock["input"];

export class McpClient {
  private readonly toolNames = new Map<string, string>();

  constructor(
    private readonly gatewayUrl: string,
    private readonly authHeader: string,
  ) {}

  // GatewayのMCP tool一覧をBedrock ConverseのtoolConfig形式へ変換する。
  async listTools(): Promise<Tool[]> {
    const result = await this.useClient((client) => client.listTools());
    this.toolNames.clear();

    if (result.tools.length === 0) {
      throw new Error("AgentCore Gateway did not return tools");
    }

    return result.tools.map((tool) => this.buildTool(tool));
  }

  // Bedrockから渡されたtool inputをそのままMCP Gatewayへ中継する。
  async callTool(name: string, args: ToolInput): Promise<ToolResultContentBlock[]> {
    const fullName = this.toolNames.get(name);
    if (fullName === undefined) {
      throw new Error(`Unknown tool: ${name}`);
    }

    const result = await this.useClient((client) =>
      client.callTool({
        name: fullName,
        arguments: JSON.parse(JSON.stringify(args)),
      }, CallToolResultSchema),
    );

    return this.buildToolResult(CallToolResultSchema.parse(result));
  }

  private async useClient<T>(fn: (client: Client) => Promise<T>): Promise<T> {
    const transport = new StreamableHTTPClientTransport(new URL(this.gatewayUrl), {
      requestInit: {
        headers: {
          Authorization: this.authHeader,
        },
      },
    });
    const client = new Client({
      name: "workops-suite-agentcore-runtime",
      version: "1.0.0",
    });

    try {
      await client.connect(transport);
      return await fn(client);
    } finally {
      await transport.close();
    }
  }

  private buildTool(tool: McpTool): Tool {
    const shortName = this.shortName(tool.name);
    this.toolNames.set(shortName, tool.name);

    return {
      toolSpec: {
        name: shortName,
        description: tool.description ?? "AgentCore Gateway tool",
        inputSchema: {
          json: JSON.parse(JSON.stringify(tool.inputSchema)),
        },
      },
    };
  }

  private shortName(name: string): string {
    const matched = name.match(/(?:.+)_{2,3}(.+)/);
    if (matched === null) {
      return name;
    }

    const shortName = matched[1];
    if (shortName === undefined || shortName.length === 0) {
      return name;
    }

    return shortName;
  }

  private buildToolResult(result: CallToolResult): ToolResultContentBlock[] {
    if (result.isError === true) {
      throw new Error(`Tool execution returned error: ${JSON.stringify(result.content)}`);
    }

    if (result.structuredContent !== undefined) {
      return [{ json: JSON.parse(JSON.stringify(result.structuredContent)) }];
    }

    if (result.content.length === 0) {
      throw new Error("Tool execution returned no content");
    }

    return result.content.map((content) => {
      if (content.type !== "text") {
        throw new Error(`Unsupported MCP content type: ${content.type}`);
      }

      return { text: content.text };
    });
  }
}
