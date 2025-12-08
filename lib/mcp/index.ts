/**
 * MCP Module - Barrel Export
 * Model Context Protocol implementation for Y-CRM
 */

// Protocol
export * from "./protocol";

// Client
export { 
  MCPClient, 
  createMCPClient,
  MCPSession,
  createTransport,
} from "./client";
export type { 
  MCPClientConfig, 
  MCPClientState,
  MCPSessionConfig,
  Transport,
  TransportConfig,
  StdioTransportConfig,
  SSETransportConfig,
} from "./client";

// Server
export {
  MCPServer,
  getMCPServer,
  initializeMCPServer,
} from "./server";
export type {
  MCPServerConfig,
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
} from "./registry";
export type {
  InternalToolDefinition,
  ExternalToolReference,
  UnifiedTool,
  ToolExecutionResult,
} from "./registry";
export { internalTools, registerInternalTools } from "./registry/internal";
