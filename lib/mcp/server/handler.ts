/**
 * MCP Server Handler
 * Handles JSON-RPC requests and manages server state
 */

import {
  JSONRPCRequest,
  JSONRPCResponse,
  JSONRPCNotification,
  JSONRPCMessage,
  InitializeParams,
  InitializeResult,
  MCPMethods,
  LATEST_PROTOCOL_VERSION,
  SUPPORTED_PROTOCOL_VERSIONS,
  MCPTool,
  ListToolsResult,
  CallToolParams,
  CallToolResult,
  TextContent,
  ServerCapabilities,
  Resource,
  ListResourcesResult,
} from "../protocol";
import {
  MCPError,
  methodNotFound,
  invalidParams,
  internalError,
  toolExecutionFailed,
} from "../protocol/errors";
import { DEFAULT_SERVER_CAPABILITIES, Y_CRM_SERVER_INFO } from "../protocol/capabilities";
import { ServerConnection } from "./transport/base";

/**
 * Tool Handler Function
 */
export type ToolHandler = (
  args: Record<string, unknown>,
  context: ToolContext
) => Promise<ToolResult>;

export interface ToolContext {
  orgId: string;
  userId: string;
  connectionId: string;
}

export interface ToolResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

/**
 * Tool Definition for Server
 */
export interface ServerToolDefinition {
  tool: MCPTool;
  handler: ToolHandler;
}

/**
 * MCP Server Handler
 * Processes incoming JSON-RPC messages
 */
export class MCPServerHandler {
  private tools: Map<string, ServerToolDefinition> = new Map();
  private resources: Map<string, Resource> = new Map();
  private capabilities: ServerCapabilities;
  private initializedConnections: Set<string> = new Set();

  constructor(capabilities?: Partial<ServerCapabilities>) {
    this.capabilities = {
      ...DEFAULT_SERVER_CAPABILITIES,
      ...capabilities,
    };
  }

  /**
   * Register a tool
   */
  registerTool(name: string, tool: MCPTool, handler: ToolHandler): void {
    this.tools.set(name, { tool, handler });
  }

  /**
   * Register multiple tools
   */
  registerTools(tools: Array<{ name: string; tool: MCPTool; handler: ToolHandler }>): void {
    for (const { name, tool, handler } of tools) {
      this.registerTool(name, tool, handler);
    }
  }

  /**
   * Register a resource
   */
  registerResource(resource: Resource): void {
    this.resources.set(resource.uri, resource);
  }

  /**
   * Handle an incoming JSON-RPC message
   */
  async handleMessage(
    message: JSONRPCMessage,
    connection: ServerConnection,
    context: Omit<ToolContext, "connectionId">
  ): Promise<JSONRPCResponse | null> {
    // Handle requests (expect response)
    if ("id" in message && message.id !== undefined && "method" in message) {
      const request = message as JSONRPCRequest;
      return this.handleRequest(request, connection, {
        ...context,
        connectionId: connection.id,
      });
    }

    // Handle notifications (no response)
    if ("method" in message && !("id" in message)) {
      const notification = message as JSONRPCNotification;
      await this.handleNotification(notification, connection);
      return null;
    }

    // Invalid message
    return {
      jsonrpc: "2.0",
      id: null as unknown as number,
      error: invalidParams("Invalid JSON-RPC message"),
    };
  }

  /**
   * Handle a JSON-RPC request
   */
  private async handleRequest(
    request: JSONRPCRequest,
    connection: ServerConnection,
    context: ToolContext
  ): Promise<JSONRPCResponse> {
    try {
      let result: unknown;

      switch (request.method) {
        case MCPMethods.Initialize:
          result = await this.handleInitialize(
            request.params as unknown as InitializeParams,
            connection
          );
          break;

        case MCPMethods.Ping:
          result = {};
          break;

        case MCPMethods.ListTools:
          result = this.handleListTools();
          break;

        case MCPMethods.CallTool:
          result = await this.handleCallTool(
            request.params as unknown as CallToolParams,
            context
          );
          break;

        case MCPMethods.ListResources:
          result = this.handleListResources();
          break;

        case MCPMethods.ReadResource:
          result = await this.handleReadResource(
            request.params as unknown as { uri: string }
          );
          break;

        default:
          throw new MCPError(methodNotFound(request.method));
      }

      return {
        jsonrpc: "2.0",
        id: request.id,
        result,
      };
    } catch (error) {
      const mcpError = MCPError.fromError(error);
      return {
        jsonrpc: "2.0",
        id: request.id,
        error: mcpError.toJSON(),
      };
    }
  }

  /**
   * Handle a JSON-RPC notification
   */
  private async handleNotification(
    notification: JSONRPCNotification,
    connection: ServerConnection
  ): Promise<void> {
    switch (notification.method) {
      case MCPMethods.Initialized:
        console.log(`[MCP Server] Client ${connection.id} initialized`);
        break;

      case MCPMethods.Cancelled:
        console.log(`[MCP Server] Request cancelled:`, notification.params);
        break;

      default:
        console.log(`[MCP Server] Unknown notification:`, notification.method);
    }
  }

  /**
   * Handle initialize request
   */
  private async handleInitialize(
    params: InitializeParams,
    connection: ServerConnection
  ): Promise<InitializeResult> {
    // Check protocol version
    if (!SUPPORTED_PROTOCOL_VERSIONS.includes(params.protocolVersion as typeof SUPPORTED_PROTOCOL_VERSIONS[number])) {
      // Use the latest version we support
      console.warn(
        `[MCP Server] Client requested unsupported protocol version: ${params.protocolVersion}`
      );
    }

    console.log(`[MCP Server] Initialize from ${params.clientInfo.name} v${params.clientInfo.version}`);

    this.initializedConnections.add(connection.id);

    return {
      protocolVersion: LATEST_PROTOCOL_VERSION,
      capabilities: this.capabilities,
      serverInfo: Y_CRM_SERVER_INFO,
      instructions: "Y-CRM MCP Server - Manage your CRM data using natural language",
    };
  }

  /**
   * Handle list tools request
   */
  private handleListTools(): ListToolsResult {
    const tools = Array.from(this.tools.values()).map((def) => def.tool);
    return { tools };
  }

  /**
   * Handle call tool request
   */
  private async handleCallTool(
    params: CallToolParams,
    context: ToolContext
  ): Promise<CallToolResult> {
    const toolDef = this.tools.get(params.name);
    if (!toolDef) {
      throw new MCPError(toolExecutionFailed(params.name, "Tool not found"));
    }

    try {
      const result = await toolDef.handler(params.arguments || {}, context);

      if (result.success) {
        const content: TextContent = {
          type: "text",
          text: typeof result.data === "string" 
            ? result.data 
            : JSON.stringify(result.data, null, 2),
        };
        return { content: [content] };
      } else {
        const content: TextContent = {
          type: "text",
          text: result.error || "Tool execution failed",
        };
        return { content: [content], isError: true };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new MCPError(toolExecutionFailed(params.name, errorMessage));
    }
  }

  /**
   * Handle list resources request
   */
  private handleListResources(): ListResourcesResult {
    const resources = Array.from(this.resources.values());
    return { resources };
  }

  /**
   * Handle read resource request
   */
  private async handleReadResource(
    params: { uri: string }
  ): Promise<{ contents: Array<{ uri: string; text?: string }> }> {
    const resource = this.resources.get(params.uri);
    if (!resource) {
      throw new MCPError(internalError(`Resource not found: ${params.uri}`));
    }

    // For now, just return a placeholder
    // In a real implementation, this would fetch the actual resource content
    return {
      contents: [
        {
          uri: params.uri,
          text: `Resource: ${resource.name}`,
        },
      ],
    };
  }

  /**
   * Check if a connection is initialized
   */
  isInitialized(connectionId: string): boolean {
    return this.initializedConnections.has(connectionId);
  }

  /**
   * Remove a connection
   */
  removeConnection(connectionId: string): void {
    this.initializedConnections.delete(connectionId);
  }

  /**
   * Get registered tool names
   */
  getToolNames(): string[] {
    return Array.from(this.tools.keys());
  }

  /**
   * Get tool count
   */
  get toolCount(): number {
    return this.tools.size;
  }
}
