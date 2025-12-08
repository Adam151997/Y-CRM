/**
 * Composio Integration Module
 * Provides universal tool connections via Composio
 */

// Client
export {
  ComposioClient,
  getComposioClient,
  resetComposioClient,
} from "./client";
export type {
  ComposioConfig,
  ComposioTool,
  ComposioApp,
  ConnectedAccount,
  ConnectionRequest,
  ToolExecutionResult,
} from "./client";

// Tools
export {
  FEATURED_APPS,
  composioToolToMCP,
  createComposioToolDefinition,
  getToolsForApp,
  getAllComposioTools,
  getConnectedAppTools,
  executeComposioTool,
  getSuggestedTools,
} from "./tools";
export type { FeaturedAppKey } from "./tools";

// Connections
export {
  getEntityId,
  getConnectionStatuses,
  initiateConnection,
  handleOAuthCallback,
  disconnectApp,
  syncConnectionStatuses,
  hasConnection,
  getActiveConnections,
} from "./connections";
export type { AppConnectionStatus } from "./connections";

// Registry Integration
export {
  registerComposioAppTools,
  registerConnectedAppTools,
  executeComposioToolDirect,
  getAvailableComposioTools,
} from "./registry-integration";
