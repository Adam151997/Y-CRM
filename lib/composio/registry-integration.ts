/**
 * Composio Tool Integration for MCP Registry
 * Integrates Composio tools with the Y-CRM tool registry
 */

import { ToolRegistry, InternalToolDefinition, ToolExecutionResult } from "@/lib/mcp/registry";
import { ToolContext } from "@/lib/mcp/server/handler";
import {
  getComposioClient,
  getEntityId,
  hasConnection,
  ComposioTool,
} from "@/lib/composio";
import { MCPTool } from "@/lib/mcp/protocol";

/**
 * Convert Composio tool to MCP format
 */
function toMCPTool(tool: ComposioTool, appName: string): MCPTool {
  return {
    name: `composio_${appName}_${tool.name}`.toLowerCase().replace(/[^a-z0-9_]/g, "_"),
    description: tool.description || `${tool.displayName || tool.name} via ${appName}`,
    inputSchema: {
      type: "object",
      properties: tool.parameters.properties as unknown as Record<string, { type: string; description?: string }>,
      required: tool.parameters.required,
    },
  };
}

/**
 * Create tool execution handler for a Composio tool
 */
function createToolHandler(
  tool: ComposioTool,
  appName: string
): (args: Record<string, unknown>, context: ToolContext) => Promise<{ success: boolean; data?: unknown; error?: string }> {
  return async (args, context) => {
    const client = getComposioClient();
    const entityId = getEntityId(context.orgId);

    // Check if user has connection
    const connected = await hasConnection(context.orgId, appName);
    if (!connected) {
      return {
        success: false,
        error: `Not connected to ${appName}. Please connect in Settings > Integrations.`,
      };
    }

    // Execute via Composio
    const result = await client.executeTool(tool.name, args, entityId);
    return result;
  };
}

/**
 * Register Composio tools for a specific app into the registry
 */
export async function registerComposioAppTools(
  registry: ToolRegistry,
  appName: string
): Promise<number> {
  const client = getComposioClient();
  
  try {
    const tools = await client.listTools(appName);
    let count = 0;
    
    for (const tool of tools.slice(0, 15)) { // Limit to 15 tools per app
      const mcpTool = toMCPTool(tool, appName);
      const definition: InternalToolDefinition = {
        name: mcpTool.name.replace("composio_", ""), // Registry will add prefix
        tool: mcpTool,
        execute: createToolHandler(tool, appName),
      };
      
      // Register with special prefix for Composio tools
      registry.registerInternalTool({
        ...definition,
        name: `composio_${appName}_${tool.name}`.toLowerCase().replace(/[^a-z0-9_]/g, "_"),
      });
      count++;
    }
    
    return count;
  } catch (error) {
    console.error(`Failed to register tools for ${appName}:`, error);
    return 0;
  }
}

/**
 * Register tools for all connected apps
 */
export async function registerConnectedAppTools(
  registry: ToolRegistry,
  orgId: string
): Promise<{ [appName: string]: number }> {
  const client = getComposioClient();
  const entityId = getEntityId(orgId);
  
  const results: { [appName: string]: number } = {};
  
  try {
    const connections = await client.listConnectedAccounts(entityId);
    const activeApps = connections
      .filter((conn) => conn.status === "active")
      .map((conn) => conn.appName.toLowerCase());
    
    for (const appName of activeApps) {
      const count = await registerComposioAppTools(registry, appName);
      results[appName] = count;
    }
  } catch (error) {
    console.error("Failed to register connected app tools:", error);
  }
  
  return results;
}

/**
 * Execute a Composio tool directly (without going through registry)
 */
export async function executeComposioToolDirect(
  toolName: string,
  args: Record<string, unknown>,
  orgId: string
): Promise<ToolExecutionResult> {
  const client = getComposioClient();
  const entityId = getEntityId(orgId);
  
  // Parse tool name: composio_appname_actionname
  const parts = toolName.split("_");
  if (parts.length < 3 || parts[0] !== "composio") {
    return {
      success: false,
      content: `Invalid Composio tool name: ${toolName}`,
      source: "external",
    };
  }
  
  const appName = parts[1];
  const actionName = parts.slice(2).join("_").toUpperCase();
  
  // Check connection
  const connected = await hasConnection(orgId, appName);
  if (!connected) {
    return {
      success: false,
      content: `Not connected to ${appName}. Please connect in Settings > Integrations.`,
      source: "external",
    };
  }
  
  try {
    const result = await client.executeTool(actionName, args, entityId);
    return {
      success: result.success,
      content: result.success
        ? typeof result.data === "string"
          ? result.data
          : JSON.stringify(result.data, null, 2)
        : result.error || "Unknown error",
      data: result.data,
      source: "external",
    };
  } catch (error) {
    return {
      success: false,
      content: error instanceof Error ? error.message : String(error),
      source: "external",
    };
  }
}

/**
 * Get available Composio tools for an org (based on connected apps)
 */
export async function getAvailableComposioTools(orgId: string): Promise<MCPTool[]> {
  const client = getComposioClient();
  const entityId = getEntityId(orgId);
  
  const tools: MCPTool[] = [];
  
  try {
    const connections = await client.listConnectedAccounts(entityId);
    const activeApps = connections
      .filter((conn) => conn.status === "active")
      .map((conn) => conn.appName.toLowerCase());
    
    for (const appName of activeApps) {
      try {
        const appTools = await client.listTools(appName);
        for (const tool of appTools.slice(0, 10)) { // Limit per app
          tools.push(toMCPTool(tool, appName));
        }
      } catch (error) {
        console.error(`Failed to get tools for ${appName}:`, error);
      }
    }
  } catch (error) {
    console.error("Failed to get available Composio tools:", error);
  }
  
  return tools;
}
