/**
 * MCP Tool Registry
 * Unifies internal Y-CRM tools with external tools from MCP servers
 */

import { MCPTool, CallToolResult, TextContent } from "../protocol";
import { MCPClient } from "../client";
import { ToolContext, ToolResult } from "../server/handler";

/**
 * Internal Tool Definition
 */
export interface InternalToolDefinition {
  name: string;
  tool: MCPTool;
  execute: (args: Record<string, unknown>, context: ToolContext) => Promise<ToolResult>;
}

/**
 * External Tool Reference
 */
export interface ExternalToolReference {
  name: string;
  tool: MCPTool;
  client: MCPClient;
  serverName: string;
}

/**
 * Unified Tool
 */
export interface UnifiedTool {
  name: string;
  description?: string;
  source: "internal" | "external";
  serverName?: string;
  inputSchema: MCPTool["inputSchema"];
}

/**
 * Tool Execution Result
 */
export interface ToolExecutionResult {
  success: boolean;
  content: string;
  data?: unknown;
  source: "internal" | "external";
}

/**
 * Tool Registry
 * Manages both internal and external tools, providing a unified interface
 */
export class ToolRegistry {
  private internalTools: Map<string, InternalToolDefinition> = new Map();
  private externalTools: Map<string, ExternalToolReference> = new Map();
  private mcpClients: Map<string, MCPClient> = new Map();

  /**
   * Register an internal tool
   */
  registerInternalTool(definition: InternalToolDefinition): void {
    const prefixedName = `ycrm_${definition.name}`;
    this.internalTools.set(prefixedName, {
      ...definition,
      name: prefixedName,
    });
  }

  /**
   * Register multiple internal tools
   */
  registerInternalTools(definitions: InternalToolDefinition[]): void {
    definitions.forEach((def) => {
      this.registerInternalTool(def);
    });
  }

  /**
   * Add an MCP client and register its tools
   */
  async addMCPClient(name: string, client: MCPClient): Promise<void> {
    this.mcpClients.set(name, client);

    // Fetch and register tools from the client
    if (client.hasToolsCapability()) {
      const tools = await client.listTools();
      tools.forEach((tool) => {
        const prefixedName = `${name}_${tool.name}`;
        this.externalTools.set(prefixedName, {
          name: prefixedName,
          tool,
          client,
          serverName: name,
        });
      });
    }
  }

  /**
   * Remove an MCP client and its tools
   */
  async removeMCPClient(name: string): Promise<void> {
    const client = this.mcpClients.get(name);
    if (client) {
      await client.disconnect();
      this.mcpClients.delete(name);

      // Remove associated external tools
      const toolsToRemove: string[] = [];
      this.externalTools.forEach((ref, toolName) => {
        if (ref.serverName === name) {
          toolsToRemove.push(toolName);
        }
      });
      toolsToRemove.forEach((toolName) => this.externalTools.delete(toolName));
    }
  }

  /**
   * Get all available tools
   */
  getAllTools(): UnifiedTool[] {
    const tools: UnifiedTool[] = [];

    // Add internal tools
    this.internalTools.forEach((def) => {
      tools.push({
        name: def.name,
        description: def.tool.description,
        source: "internal",
        inputSchema: def.tool.inputSchema,
      });
    });

    // Add external tools
    this.externalTools.forEach((ref) => {
      tools.push({
        name: ref.name,
        description: ref.tool.description,
        source: "external",
        serverName: ref.serverName,
        inputSchema: ref.tool.inputSchema,
      });
    });

    return tools;
  }

  /**
   * Get tools in MCP format (for AI agent)
   */
  getMCPTools(): MCPTool[] {
    const tools: MCPTool[] = [];

    this.internalTools.forEach((def) => {
      tools.push(def.tool);
    });

    this.externalTools.forEach((ref) => {
      tools.push({
        ...ref.tool,
        name: ref.name, // Use prefixed name
      });
    });

    return tools;
  }

  /**
   * Check if a tool exists
   */
  hasTool(name: string): boolean {
    return this.internalTools.has(name) || this.externalTools.has(name);
  }

  /**
   * Get tool info
   */
  getTool(name: string): UnifiedTool | null {
    const internal = this.internalTools.get(name);
    if (internal) {
      return {
        name: internal.name,
        description: internal.tool.description,
        source: "internal",
        inputSchema: internal.tool.inputSchema,
      };
    }

    const external = this.externalTools.get(name);
    if (external) {
      return {
        name: external.name,
        description: external.tool.description,
        source: "external",
        serverName: external.serverName,
        inputSchema: external.tool.inputSchema,
      };
    }

    return null;
  }

  /**
   * Execute a tool by name
   */
  async execute(
    name: string,
    args: Record<string, unknown>,
    context: ToolContext
  ): Promise<ToolExecutionResult> {
    // Try internal tool first
    const internal = this.internalTools.get(name);
    if (internal) {
      try {
        const result = await internal.execute(args, context);
        return {
          success: result.success,
          content: result.success
            ? typeof result.data === "string"
              ? result.data
              : JSON.stringify(result.data)
            : result.error || "Unknown error",
          data: result.data,
          source: "internal",
        };
      } catch (error) {
        return {
          success: false,
          content: error instanceof Error ? error.message : String(error),
          source: "internal",
        };
      }
    }

    // Try external tool
    const external = this.externalTools.get(name);
    if (external) {
      try {
        // Remove prefix for the actual call
        const originalName = name.replace(`${external.serverName}_`, "");
        const result = await external.client.callTool(originalName, args);

        // Extract text content
        const textContent = result.content.find(
          (c): c is TextContent => c.type === "text"
        );

        return {
          success: !result.isError,
          content: textContent?.text || JSON.stringify(result.content),
          data: result.content,
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

    return {
      success: false,
      content: `Tool not found: ${name}`,
      source: "internal",
    };
  }

  /**
   * Get connected MCP client names
   */
  getConnectedClients(): string[] {
    return Array.from(this.mcpClients.keys());
  }

  /**
   * Get internal tool count
   */
  get internalToolCount(): number {
    return this.internalTools.size;
  }

  /**
   * Get external tool count
   */
  get externalToolCount(): number {
    return this.externalTools.size;
  }

  /**
   * Get total tool count
   */
  get totalToolCount(): number {
    return this.internalTools.size + this.externalTools.size;
  }

  /**
   * Clear all registrations
   */
  async clear(): Promise<void> {
    // Disconnect all clients
    const disconnectPromises: Promise<void>[] = [];
    this.mcpClients.forEach((client, name) => {
      disconnectPromises.push(
        client.disconnect().catch((error) => {
          console.error(`Error disconnecting ${name}:`, error);
        })
      );
    });
    await Promise.all(disconnectPromises);

    this.internalTools.clear();
    this.externalTools.clear();
    this.mcpClients.clear();
  }
}

// Singleton registry instance
let registryInstance: ToolRegistry | null = null;

/**
 * Get the Tool Registry instance (singleton)
 */
export function getToolRegistry(): ToolRegistry {
  if (!registryInstance) {
    registryInstance = new ToolRegistry();
  }
  return registryInstance;
}

/**
 * Reset the registry (for testing)
 */
export async function resetToolRegistry(): Promise<void> {
  if (registryInstance) {
    await registryInstance.clear();
    registryInstance = null;
  }
}
