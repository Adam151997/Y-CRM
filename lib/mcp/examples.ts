/**
 * MCP Client Usage Example
 * 
 * This file demonstrates how to use the MCP client to connect
 * to external MCP servers (like Composio, or custom servers)
 */

import { MCPClient, createMCPClient, getToolRegistry } from "@/lib/mcp";

/**
 * Example: Connect to an external MCP server
 */
async function connectToExternalServer() {
  // Create MCP client for an external server
  const client = await createMCPClient({
    transport: {
      type: "sse",
      url: "https://mcp.example.com/v1",
      headers: {
        Authorization: "Bearer your-api-key",
      },
    },
    autoInitialize: true,
  });

  console.log("Connected to server:", client.state.serverInfo);
  console.log("Capabilities:", client.state.capabilities);

  // List available tools
  const tools = await client.listTools();
  console.log("Available tools:", tools.map(t => t.name));

  // Call a tool
  const result = await client.callTool("some_tool", {
    param1: "value1",
  });
  console.log("Tool result:", result);

  // Disconnect when done
  await client.disconnect();
}

/**
 * Example: Register external server with tool registry
 */
async function registerExternalServer() {
  const registry = getToolRegistry();

  // Create and connect to external MCP server
  const composioClient = await createMCPClient({
    transport: {
      type: "sse",
      url: process.env.COMPOSIO_MCP_URL || "https://mcp.composio.dev",
      headers: {
        Authorization: `Bearer ${process.env.COMPOSIO_API_KEY}`,
      },
    },
  });

  // Register with the registry - tools get prefixed with server name
  await registry.addMCPClient("composio", composioClient);

  // Now all Composio tools are available with 'composio_' prefix
  const allTools = registry.getAllTools();
  console.log("All available tools:", allTools.map(t => ({
    name: t.name,
    source: t.source,
    server: t.serverName,
  })));

  // Execute a tool (registry routes to correct server)
  const result = await registry.execute(
    "composio_gmail_send", // prefixed name
    { to: "user@example.com", subject: "Hello" },
    { orgId: "org_123", userId: "user_123", connectionId: "conn_123" }
  );
  console.log("Execution result:", result);
}

/**
 * Example: Connect to a stdio-based MCP server
 * (Only works in Node.js environment)
 */
async function connectToStdioServer() {
  const client = await createMCPClient({
    transport: {
      type: "stdio",
      command: "npx",
      args: ["@anthropic/mcp-google"],
      env: {
        GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID!,
        GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET!,
      },
    },
  });

  const tools = await client.listTools();
  console.log("Google MCP tools:", tools);

  await client.disconnect();
}

/**
 * Example: Use the unified registry in your AI agent
 */
async function useInAIAgent() {
  const registry = getToolRegistry();

  // Get all tools in a format suitable for AI
  const mcpTools = registry.getMCPTools();

  // Your AI agent can now use these tools
  // When the agent decides to call a tool:
  const toolName = "ycrm_create_lead"; // or "composio_gmail_send"
  const args = { firstName: "John", lastName: "Doe" };
  const context = { orgId: "org_123", userId: "user_123", connectionId: "conn_123" };

  const result = await registry.execute(toolName, args, context);

  if (result.success) {
    console.log("Tool succeeded:", result.content);
  } else {
    console.log("Tool failed:", result.content);
  }
}

// Export for testing
export {
  connectToExternalServer,
  registerExternalServer,
  connectToStdioServer,
  useInAIAgent,
};
