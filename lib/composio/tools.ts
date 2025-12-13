/**
 * Composio Tools Adapter
 * Converts Composio tools to Y-CRM's internal format and handles execution
 */

import { getComposioClient, ComposioTool, ToolExecutionResult } from "./client";
import { COMPOSIO_APPS, ComposioAppConfig } from "./apps";
import { MCPTool } from "@/lib/mcp/protocol";
import { ToolContext, ToolResult } from "@/lib/mcp/server/handler";
import { InternalToolDefinition } from "@/lib/mcp/registry";

/**
 * Convert Composio tool to MCP format
 */
export function composioToolToMCP(tool: ComposioTool): MCPTool {
  return {
    name: `composio_${tool.appName}_${tool.name}`.toLowerCase().replace(/[^a-z0-9_]/g, "_"),
    description: tool.description || `${tool.displayName || tool.name} via ${tool.appName}`,
    inputSchema: {
      type: "object",
      properties: tool.parameters.properties,
      required: tool.parameters.required,
    } as MCPTool["inputSchema"],
  };
}

/**
 * Create an executable tool definition from a Composio tool
 */
export function createComposioToolDefinition(
  tool: ComposioTool,
  entityIdGetter: (context: ToolContext) => string
): InternalToolDefinition {
  const mcpTool = composioToolToMCP(tool);
  
  return {
    name: mcpTool.name.replace("composio_", ""),
    tool: mcpTool,
    execute: async (args: Record<string, unknown>, context: ToolContext): Promise<ToolResult> => {
      const client = getComposioClient();
      const entityId = entityIdGetter(context);
      
      try {
        // Check if user has active connection
        const hasConnection = await client.hasActiveConnection(entityId, tool.appName);
        if (!hasConnection) {
          return {
            success: false,
            error: `Not connected to ${tool.appName}. Please connect your account in Settings → Integrations.`,
          };
        }

        // Execute the tool
        const result = await client.executeTool(tool.name, args, entityId);
        
        return {
          success: result.success,
          data: result.data,
          error: result.error,
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    },
  };
}

/**
 * Fetch tools for a specific app
 */
export async function getToolsForApp(appName: string): Promise<MCPTool[]> {
  const client = getComposioClient();
  const tools = await client.listTools(appName);
  return tools.map(composioToolToMCP);
}

/**
 * Fetch all available tools (limited to common actions)
 */
export async function getAllComposioTools(): Promise<MCPTool[]> {
  const client = getComposioClient();
  const allTools: MCPTool[] = [];
  
  // Fetch tools for all configured apps
  for (const app of COMPOSIO_APPS) {
    try {
      const tools = await client.listTools(app.key);
      // Limit to most common actions per app (avoid overwhelming the AI)
      const limitedTools = tools.slice(0, 10);
      allTools.push(...limitedTools.map(composioToolToMCP));
    } catch (error) {
      console.error(`Failed to fetch tools for ${app.key}:`, error);
    }
  }
  
  return allTools;
}

/**
 * Get tools only for apps the user has connected
 */
export async function getConnectedAppTools(entityId: string): Promise<MCPTool[]> {
  const client = getComposioClient();
  const connections = await client.listConnectedAccounts(entityId);
  
  const activeApps = connections
    .filter((conn) => conn.status === "active")
    .map((conn) => conn.appName.toLowerCase());
  
  const allTools: MCPTool[] = [];
  
  for (const appName of activeApps) {
    try {
      const tools = await client.listTools(appName);
      allTools.push(...tools.map(composioToolToMCP));
    } catch (error) {
      console.error(`Failed to fetch tools for ${appName}:`, error);
    }
  }
  
  return allTools;
}

/**
 * Execute a Composio tool by name
 */
export async function executeComposioTool(
  toolName: string,
  args: Record<string, unknown>,
  entityId: string
): Promise<ToolExecutionResult> {
  const client = getComposioClient();
  
  // Parse tool name to get action name
  // Format: composio_appname_actionname
  const parts = toolName.split("_");
  if (parts.length < 3 || parts[0] !== "composio") {
    return {
      success: false,
      error: `Invalid Composio tool name: ${toolName}`,
    };
  }
  
  // Reconstruct the original action name
  const actionName = parts.slice(2).join("_").toUpperCase();
  const appName = parts[1];
  
  // Check connection
  const hasConnection = await client.hasActiveConnection(entityId, appName);
  if (!hasConnection) {
    return {
      success: false,
      error: `Not connected to ${appName}. Please connect your account in Settings → Integrations.`,
    };
  }
  
  return client.executeTool(actionName, args, entityId);
}

/**
 * Get suggested apps based on user intent
 */
export function getSuggestedTools(intent: string): string[] {
  const intentLower = intent.toLowerCase();
  const suggestions: string[] = [];
  
  if (intentLower.includes("email") || intentLower.includes("mail")) {
    suggestions.push("gmail");
  }
  if (intentLower.includes("meeting") || intentLower.includes("calendar") || intentLower.includes("schedule")) {
    suggestions.push("googlecalendar");
  }
  if (intentLower.includes("message") || intentLower.includes("slack") || intentLower.includes("team")) {
    suggestions.push("slack");
  }
  if (intentLower.includes("whatsapp") || intentLower.includes("text")) {
    suggestions.push("whatsapp");
  }
  if (intentLower.includes("note") || intentLower.includes("notion") || intentLower.includes("wiki")) {
    suggestions.push("notion");
  }
  if (intentLower.includes("task") || intentLower.includes("trello") || intentLower.includes("board")) {
    suggestions.push("trello");
  }
  if (intentLower.includes("project") || intentLower.includes("asana")) {
    suggestions.push("asana");
  }
  if (intentLower.includes("ad") || intentLower.includes("google ads") || intentLower.includes("campaign")) {
    suggestions.push("googleads");
  }
  if (intentLower.includes("facebook") || intentLower.includes("meta") || intentLower.includes("instagram")) {
    suggestions.push("facebookads");
  }
  if (intentLower.includes("newsletter") || intentLower.includes("mailchimp") || intentLower.includes("audience")) {
    suggestions.push("mailchimp");
  }
  if (intentLower.includes("linkedin") || intentLower.includes("profile")) {
    suggestions.push("linkedin");
  }
  if (intentLower.includes("enrich") || intentLower.includes("zoominfo") || intentLower.includes("company data")) {
    suggestions.push("zoominfo");
  }
  
  return suggestions;
}
