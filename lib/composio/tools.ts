/**
 * Composio Tools Adapter
 * Converts Composio tools to Y-CRM's internal format and handles execution
 */

import { getComposioClient, ComposioTool, ToolExecutionResult } from "./client";
import { MCPTool } from "@/lib/mcp/protocol";
import { ToolContext, ToolResult } from "@/lib/mcp/server/handler";
import { InternalToolDefinition } from "@/lib/mcp/registry";

/**
 * Popular apps we want to feature prominently
 */
export const FEATURED_APPS = [
  { key: "gmail", name: "Gmail", icon: "mail", category: "communication" },
  { key: "googlecalendar", name: "Google Calendar", icon: "calendar", category: "productivity" },
  { key: "googledrive", name: "Google Drive", icon: "hard-drive", category: "storage" },
  { key: "slack", name: "Slack", icon: "message-square", category: "communication" },
  { key: "github", name: "GitHub", icon: "github", category: "development" },
  { key: "notion", name: "Notion", icon: "book", category: "productivity" },
  { key: "linear", name: "Linear", icon: "layout", category: "development" },
  { key: "hubspot", name: "HubSpot", icon: "users", category: "crm" },
  { key: "salesforce", name: "Salesforce", icon: "cloud", category: "crm" },
  { key: "asana", name: "Asana", icon: "check-square", category: "productivity" },
  { key: "trello", name: "Trello", icon: "trello", category: "productivity" },
  { key: "jira", name: "Jira", icon: "clipboard", category: "development" },
] as const;

export type FeaturedAppKey = typeof FEATURED_APPS[number]["key"];

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
    name: mcpTool.name.replace("composio_", ""), // Without prefix for internal registration
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
            error: `Not connected to ${tool.appName}. Please connect your account in Settings.`,
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
  
  // Fetch tools for featured apps only (to avoid overwhelming the AI)
  for (const app of FEATURED_APPS) {
    try {
      const tools = await client.listTools(app.key);
      // Limit to most common actions per app
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
    .map((conn) => conn.appName);
  
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
      error: `Not connected to ${appName}. Please connect your account in Settings.`,
    };
  }
  
  return client.executeTool(actionName, args, entityId);
}

/**
 * Get suggested tools based on user intent
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
  if (intentLower.includes("file") || intentLower.includes("document") || intentLower.includes("drive")) {
    suggestions.push("googledrive");
  }
  if (intentLower.includes("message") || intentLower.includes("slack") || intentLower.includes("team")) {
    suggestions.push("slack");
  }
  if (intentLower.includes("code") || intentLower.includes("github") || intentLower.includes("issue") || intentLower.includes("pr")) {
    suggestions.push("github");
  }
  if (intentLower.includes("note") || intentLower.includes("notion") || intentLower.includes("wiki")) {
    suggestions.push("notion");
  }
  
  return suggestions;
}
