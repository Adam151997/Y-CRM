/**
 * MCP Module - Barrel Export
 * Model Context Protocol implementation for Y-CRM
 */

// Protocol
export * from "./protocol";

// Client
export { MCPClient, MCPClientConfig, MCPClientState, createMCPClient } from "./client";
export { MCPSession, MCPSessionConfig } from "./client/session";
export {
  Transport,
  TransportConfig,
  StdioTransportConfig,
  SSETransportConfig,
  createTransport,
} from "./client/transport";

// Server
export {
  MCPServer,
  MCPServerConfig,
  getMCPServer,
  initializeMCPServer,
  ToolHandler,
  ToolContext,
  ToolResult,
} from "./server";
export { MCPServerHandler } from "./server/handler";
export {
  SSEConnection,
  SSEConnectionManager,
  getSSEConnectionManager,
} from "./server/transport/sse";
export { StdioServerTransport } from "./server/transport/stdio";

// Registry
export {
  ToolRegistry,
  getToolRegistry,
  resetToolRegistry,
  InternalToolDefinition,
  ExternalToolReference,
  UnifiedTool,
  ToolExecutionResult,
} from "./registry";
export { internalTools, registerInternalTools } from "./registry/internal";
