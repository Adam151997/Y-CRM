/**
 * MCP Server
 * Main server class that exposes Y-CRM tools via MCP protocol
 */

import {
  MCPTool,
  JSONSchema,
  ServerCapabilities,
} from "../protocol";
import { MCPServerHandler, ToolHandler, ToolContext, ToolResult } from "./handler";
import { ServerConnection } from "./transport/base";
import { SSEConnection, getSSEConnectionManager, SSEConnectionManager } from "./transport/sse";

export interface MCPServerConfig {
  capabilities?: Partial<ServerCapabilities>;
}

export { ToolHandler, ToolContext, ToolResult };

/**
 * MCP Server
 * Exposes Y-CRM tools to external MCP clients
 */
export class MCPServer {
  private handler: MCPServerHandler;
  private connectionManager: SSEConnectionManager;

  constructor(config: MCPServerConfig = {}) {
    this.handler = new MCPServerHandler(config.capabilities);
    this.connectionManager = getSSEConnectionManager();
  }

  /**
   * Register a tool with the server
   */
  registerTool(
    name: string,
    description: string,
    inputSchema: JSONSchema,
    handler: ToolHandler
  ): void {
    const tool: MCPTool = {
      name,
      description,
      inputSchema,
    };
    this.handler.registerTool(name, tool, handler);
  }

  /**
   * Register a tool using a definition object
   */
  registerToolDefinition(
    name: string,
    tool: MCPTool,
    handler: ToolHandler
  ): void {
    this.handler.registerTool(name, tool, handler);
  }

  /**
   * Create a new SSE connection
   * Returns the connection and the stream to send to the client
   */
  createSSEConnection(): { connection: SSEConnection; stream: ReadableStream<Uint8Array> } {
    const connection = this.connectionManager.createConnection();
    const stream = connection.createStream();

    // Set up message handler
    connection.onMessage(async (message) => {
      // Note: For SSE, messages come via POST, not through the stream
      // This handler is for internal use
    });

    connection.onClose(() => {
      this.handler.removeConnection(connection.id);
    });

    return { connection, stream };
  }

  /**
   * Handle an incoming message for a connection
   */
  async handleMessage(
    connectionId: string,
    message: unknown,
    context: { orgId: string; userId: string }
  ): Promise<unknown> {
    const connection = this.connectionManager.getConnection(connectionId);
    if (!connection) {
      throw new Error(`Connection not found: ${connectionId}`);
    }

    const response = await this.handler.handleMessage(
      message as Parameters<typeof this.handler.handleMessage>[0],
      connection,
      context
    );

    // Send response back through SSE if it's not null
    if (response) {
      await connection.send(response);
    }

    return response;
  }

  /**
   * Handle an incoming message and return response directly
   * Used for POST endpoints that return response in HTTP body
   */
  async handleMessageDirect(
    connectionId: string,
    message: unknown,
    context: { orgId: string; userId: string }
  ): Promise<unknown> {
    const connection = this.connectionManager.getConnection(connectionId);
    if (!connection) {
      throw new Error(`Connection not found: ${connectionId}`);
    }

    return this.handler.handleMessage(
      message as Parameters<typeof this.handler.handleMessage>[0],
      connection,
      context
    );
  }

  /**
   * Get a connection by ID
   */
  getConnection(id: string): SSEConnection | undefined {
    return this.connectionManager.getConnection(id);
  }

  /**
   * Close a connection
   */
  async closeConnection(id: string): Promise<void> {
    await this.connectionManager.closeConnection(id);
  }

  /**
   * Get active connection count
   */
  get connectionCount(): number {
    return this.connectionManager.count;
  }

  /**
   * Get registered tool names
   */
  getToolNames(): string[] {
    return this.handler.getToolNames();
  }

  /**
   * Get tool count
   */
  get toolCount(): number {
    return this.handler.toolCount;
  }
}

// Singleton server instance
let serverInstance: MCPServer | null = null;

/**
 * Get the MCP Server instance (singleton)
 */
export function getMCPServer(): MCPServer {
  if (!serverInstance) {
    serverInstance = new MCPServer();
  }
  return serverInstance;
}

/**
 * Initialize the MCP Server with tools
 * Should be called once at application startup
 */
export function initializeMCPServer(config?: MCPServerConfig): MCPServer {
  serverInstance = new MCPServer(config);
  return serverInstance;
}
