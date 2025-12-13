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

// Apps Configuration
export {
  COMPOSIO_APPS,
  APP_CATEGORIES,
  getAppByKey,
  getAppsByCategory,
  getAppsGroupedByCategory,
  getFormBasedApps,
  getOAuthApps,
  requiresFormInput,
} from "./apps";
export type {
  ComposioAppConfig,
  AppCategory,
  AuthMethod,
} from "./apps";

// Alias for backward compatibility
export { COMPOSIO_APPS as FEATURED_APPS } from "./apps";

// Tools
export {
  composioToolToMCP,
  createComposioToolDefinition,
  getToolsForApp,
  getAllComposioTools,
  getConnectedAppTools,
  executeComposioTool,
  getSuggestedTools,
} from "./tools";

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
  saveCredentials,
} from "./connections";
export type { AppConnectionStatus } from "./connections";

// Registry Integration
export {
  registerComposioAppTools,
  registerConnectedAppTools,
  executeComposioToolDirect,
  getAvailableComposioTools,
} from "./registry-integration";
