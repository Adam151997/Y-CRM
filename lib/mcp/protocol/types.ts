/**
 * MCP Protocol Types
 * Based on Anthropic's Model Context Protocol Specification
 * https://modelcontextprotocol.io/
 */

// =============================================================================
// JSON-RPC 2.0 Base Types
// =============================================================================

export interface JSONRPCRequest {
  jsonrpc: "2.0";
  id: string | number;
  method: string;
  params?: Record<string, unknown>;
}

export interface JSONRPCNotification {
  jsonrpc: "2.0";
  method: string;
  params?: Record<string, unknown>;
}

export interface JSONRPCResponse {
  jsonrpc: "2.0";
  id: string | number;
  result?: unknown;
  error?: JSONRPCError;
}

export interface JSONRPCError {
  code: number;
  message: string;
  data?: unknown;
}

export type JSONRPCMessage = JSONRPCRequest | JSONRPCNotification | JSONRPCResponse;

// =============================================================================
// MCP Protocol Version
// =============================================================================

export const LATEST_PROTOCOL_VERSION = "2024-11-05";
export const SUPPORTED_PROTOCOL_VERSIONS = [
  "2024-11-05",
  "2024-10-07",
] as const;

export type ProtocolVersion = typeof SUPPORTED_PROTOCOL_VERSIONS[number];

// =============================================================================
// MCP Capabilities
// =============================================================================

export interface ServerCapabilities {
  experimental?: Record<string, unknown>;
  logging?: Record<string, never>;
  prompts?: {
    listChanged?: boolean;
  };
  resources?: {
    subscribe?: boolean;
    listChanged?: boolean;
  };
  tools?: {
    listChanged?: boolean;
  };
}

export interface ClientCapabilities {
  experimental?: Record<string, unknown>;
  roots?: {
    listChanged?: boolean;
  };
  sampling?: Record<string, never>;
}

// =============================================================================
// MCP Implementation Info
// =============================================================================

export interface Implementation {
  name: string;
  version: string;
}

// =============================================================================
// MCP Initialize
// =============================================================================

export interface InitializeParams {
  protocolVersion: string;
  capabilities: ClientCapabilities;
  clientInfo: Implementation;
}

export interface InitializeResult {
  protocolVersion: string;
  capabilities: ServerCapabilities;
  serverInfo: Implementation;
  instructions?: string;
}

// =============================================================================
// MCP Tools
// =============================================================================

export interface MCPTool {
  name: string;
  description?: string;
  inputSchema: JSONSchema;
}

export interface JSONSchema {
  type: "object";
  properties?: Record<string, JSONSchemaProperty>;
  required?: string[];
  additionalProperties?: boolean;
}

export interface JSONSchemaProperty {
  type: "string" | "number" | "integer" | "boolean" | "array" | "object";
  description?: string;
  enum?: (string | number | boolean)[];
  items?: JSONSchemaProperty;
  properties?: Record<string, JSONSchemaProperty>;
  required?: string[];
  default?: unknown;
  format?: string;
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
}

export interface ListToolsResult {
  tools: MCPTool[];
  nextCursor?: string;
}

export interface CallToolParams {
  name: string;
  arguments?: Record<string, unknown>;
}

export interface CallToolResult {
  content: ToolContent[];
  isError?: boolean;
}

export type ToolContent = TextContent | ImageContent | EmbeddedResource;

export interface TextContent {
  type: "text";
  text: string;
}

export interface ImageContent {
  type: "image";
  data: string; // base64
  mimeType: string;
}

export interface EmbeddedResource {
  type: "resource";
  resource: ResourceContents;
}

// =============================================================================
// MCP Resources
// =============================================================================

export interface Resource {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
}

export interface ResourceContents {
  uri: string;
  mimeType?: string;
  text?: string;
  blob?: string; // base64
}

export interface ListResourcesResult {
  resources: Resource[];
  nextCursor?: string;
}

export interface ReadResourceParams {
  uri: string;
}

export interface ReadResourceResult {
  contents: ResourceContents[];
}

export interface ResourceTemplate {
  uriTemplate: string;
  name: string;
  description?: string;
  mimeType?: string;
}

export interface ListResourceTemplatesResult {
  resourceTemplates: ResourceTemplate[];
  nextCursor?: string;
}

// =============================================================================
// MCP Prompts
// =============================================================================

export interface Prompt {
  name: string;
  description?: string;
  arguments?: PromptArgument[];
}

export interface PromptArgument {
  name: string;
  description?: string;
  required?: boolean;
}

export interface ListPromptsResult {
  prompts: Prompt[];
  nextCursor?: string;
}

export interface GetPromptParams {
  name: string;
  arguments?: Record<string, string>;
}

export interface GetPromptResult {
  description?: string;
  messages: PromptMessage[];
}

export interface PromptMessage {
  role: "user" | "assistant";
  content: TextContent | ImageContent | EmbeddedResource;
}

// =============================================================================
// MCP Logging
// =============================================================================

export type LogLevel = "debug" | "info" | "notice" | "warning" | "error" | "critical" | "alert" | "emergency";

export interface LoggingMessageParams {
  level: LogLevel;
  logger?: string;
  data: unknown;
}

// =============================================================================
// MCP Sampling (Client → Server requests for LLM completion)
// =============================================================================

export interface CreateMessageParams {
  messages: SamplingMessage[];
  modelPreferences?: ModelPreferences;
  systemPrompt?: string;
  includeContext?: "none" | "thisServer" | "allServers";
  temperature?: number;
  maxTokens: number;
  stopSequences?: string[];
  metadata?: Record<string, unknown>;
}

export interface SamplingMessage {
  role: "user" | "assistant";
  content: TextContent | ImageContent;
}

export interface ModelPreferences {
  hints?: ModelHint[];
  costPriority?: number;
  speedPriority?: number;
  intelligencePriority?: number;
}

export interface ModelHint {
  name?: string;
}

export interface CreateMessageResult {
  role: "assistant";
  content: TextContent | ImageContent;
  model: string;
  stopReason?: "endTurn" | "stopSequence" | "maxTokens";
}

// =============================================================================
// MCP Roots
// =============================================================================

export interface Root {
  uri: string;
  name?: string;
}

export interface ListRootsResult {
  roots: Root[];
}

// =============================================================================
// MCP Progress & Cancellation
// =============================================================================

export interface ProgressParams {
  progressToken: string | number;
  progress: number;
  total?: number;
}

export interface CancelledParams {
  requestId: string | number;
  reason?: string;
}

// =============================================================================
// MCP Method Names
// =============================================================================

export const MCPMethods = {
  // Lifecycle
  Initialize: "initialize",
  Initialized: "notifications/initialized",
  Ping: "ping",
  
  // Tools
  ListTools: "tools/list",
  CallTool: "tools/call",
  
  // Resources
  ListResources: "resources/list",
  ReadResource: "resources/read",
  ListResourceTemplates: "resources/templates/list",
  SubscribeResource: "resources/subscribe",
  UnsubscribeResource: "resources/unsubscribe",
  
  // Prompts
  ListPrompts: "prompts/list",
  GetPrompt: "prompts/get",
  
  // Logging
  SetLoggingLevel: "logging/setLevel",
  LogMessage: "notifications/message",
  
  // Sampling
  CreateMessage: "sampling/createMessage",
  
  // Roots
  ListRoots: "roots/list",
  
  // Progress
  Progress: "notifications/progress",
  
  // Cancellation
  Cancelled: "notifications/cancelled",
  
  // List Changed Notifications
  ToolsListChanged: "notifications/tools/list_changed",
  ResourcesListChanged: "notifications/resources/list_changed",
  PromptsListChanged: "notifications/prompts/list_changed",
  RootsListChanged: "notifications/roots/list_changed",
} as const;

export type MCPMethod = typeof MCPMethods[keyof typeof MCPMethods];
