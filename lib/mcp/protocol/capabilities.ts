/**
 * MCP Capabilities
 * Defines server and client capability configurations
 */

import { ServerCapabilities, ClientCapabilities, Implementation } from "./types";

// =============================================================================
// Y-CRM Server Info
// =============================================================================

export const Y_CRM_SERVER_INFO: Implementation = {
  name: "y-crm-mcp-server",
  version: "1.0.0",
};

export const Y_CRM_CLIENT_INFO: Implementation = {
  name: "y-crm-mcp-client",
  version: "1.0.0",
};

// =============================================================================
// Default Server Capabilities
// =============================================================================

export const DEFAULT_SERVER_CAPABILITIES: ServerCapabilities = {
  tools: {
    listChanged: true,
  },
  resources: {
    subscribe: false,
    listChanged: true,
  },
  prompts: {
    listChanged: false,
  },
  logging: {},
};

// =============================================================================
// Default Client Capabilities
// =============================================================================

export const DEFAULT_CLIENT_CAPABILITIES: ClientCapabilities = {
  roots: {
    listChanged: true,
  },
  sampling: {},
};

// =============================================================================
// Capability Helpers
// =============================================================================

export function mergeServerCapabilities(
  base: ServerCapabilities,
  override: Partial<ServerCapabilities>
): ServerCapabilities {
  return {
    ...base,
    ...override,
    tools: { ...base.tools, ...override.tools },
    resources: { ...base.resources, ...override.resources },
    prompts: { ...base.prompts, ...override.prompts },
  };
}

export function mergeClientCapabilities(
  base: ClientCapabilities,
  override: Partial<ClientCapabilities>
): ClientCapabilities {
  return {
    ...base,
    ...override,
    roots: { ...base.roots, ...override.roots },
  };
}

export interface NegotiatedCapabilities {
  serverCapabilities: ServerCapabilities;
  clientCapabilities: ClientCapabilities;
  protocolVersion: string;
}

export function hasToolsCapability(caps: ServerCapabilities): boolean {
  return caps.tools !== undefined;
}

export function hasResourcesCapability(caps: ServerCapabilities): boolean {
  return caps.resources !== undefined;
}

export function hasPromptsCapability(caps: ServerCapabilities): boolean {
  return caps.prompts !== undefined;
}

export function hasLoggingCapability(caps: ServerCapabilities): boolean {
  return caps.logging !== undefined;
}

export function hasSamplingCapability(caps: ClientCapabilities): boolean {
  return caps.sampling !== undefined;
}

export function hasRootsCapability(caps: ClientCapabilities): boolean {
  return caps.roots !== undefined;
}
