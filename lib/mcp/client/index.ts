/**
 * MCP Client
 * High-level client for connecting to MCP servers and using their tools
 */

import {
  MCPTool,
  ListToolsResult,
  CallToolParams,
  CallToolResult,
  Resource,
  ListResourcesResult,
  ReadResourceParams,
  ReadResourceResult,
  Prompt,
  ListPromptsResult,
  GetPromptParams,
  GetPromptResult,
  MCPMethods,
  ServerCapabilities,
  InitializeResult,
} from "../protocol";
import { Transport, TransportConfig, createTransport } from "./transport/base";
import { MCPSession, MCPSessionConfig } from "./session";

export interface MCPClientConfig extends MCPSessionConfig {
  /** Transport configuration */
  transport: TransportConfig;
  /** Auto-initialize on connect */
  autoInitialize?: boolean;
}

export interface MCPClientState {
  connected: boolean;
  initialized: boolean;
  serverInfo?: {
    name: string;
    version: string;
  };
  capabilities?: ServerCapabilities;
}

/**
 * MCP Client
 * Connects to an MCP server and provides access to its tools, resources, and prompts
 */
export class MCPClient {
  private config: MCPClientConfig;
  private transport: Transport | null = null;
  private session: MCPSession | null = null;
  private _state: MCPClientState = {
    connected: false,
    initialized: false,
  };

  // Cached data
  private toolsCache: MCPTool[] | null = null;
  private resourcesCache: Resource[] | null = null;
  private promptsCache: Prompt[] | null = null;

  constructor(config: MCPClientConfig) {
    this.config = {
      autoInitialize: true,
      ...config,
    };
  }

  get state(): MCPClientState {
    return { ...this._state };
  }

  get isConnected(): boolean {
    return this._state.connected;
  }

  get isInitialized(): boolean {
    return this._state.initialized;
  }

  /**
   * Connect to the MCP server
   */
  async connect(): Promise<InitializeResult | null> {
    if (this.isConnected) {
      throw new Error("Already connected");
    }

    try {
      // Create transport
      this.transport = await createTransport(this.config.transport);

      // Create session
      this.session = new MCPSession(this.transport, {
        requestTimeout: this.config.requestTimeout,
        onNotification: (method, params) => {
          this.handleNotification(method, params);
        },
      });

      // Start transport
      await this.transport.start();
      this._state.connected = true;

      // Auto-initialize if configured
      if (this.config.autoInitialize) {
        const result = await this.session.initialize();
        this._state.initialized = true;
        this._state.serverInfo = result.serverInfo;
        this._state.capabilities = result.capabilities;
        return result;
      }

      return null;
    } catch (error) {
      await this.disconnect();
      throw error;
    }
  }

  /**
   * Initialize the MCP session (if not auto-initialized)
   */
  async initialize(): Promise<InitializeResult> {
    if (!this.session) {
      throw new Error("Not connected");
    }
    if (this.isInitialized) {
      throw new Error("Already initialized");
    }

    const result = await this.session.initialize();
    this._state.initialized = true;
    this._state.serverInfo = result.serverInfo;
    this._state.capabilities = result.capabilities;
    return result;
  }

  /**
   * Disconnect from the MCP server
   */
  async disconnect(): Promise<void> {
    if (this.session) {
      await this.session.close();
      this.session = null;
    }
    if (this.transport) {
      await this.transport.close();
      this.transport = null;
    }
    this._state = {
      connected: false,
      initialized: false,
    };
    this.clearCaches();
  }

  // ===========================================================================
  // Tools
  // ===========================================================================

  /**
   * List available tools from the server
   */
  async listTools(forceRefresh = false): Promise<MCPTool[]> {
    this.ensureInitialized();

    if (this.toolsCache && !forceRefresh) {
      return this.toolsCache;
    }

    const result = await this.session!.request<ListToolsResult>(
      MCPMethods.ListTools
    );

    this.toolsCache = result.tools;
    return result.tools;
  }

  /**
   * Call a tool on the server
   */
  async callTool(name: string, args?: Record<string, unknown>): Promise<CallToolResult> {
    this.ensureInitialized();

    const params: CallToolParams = {
      name,
      arguments: args,
    };

    return this.session!.request<CallToolResult>(MCPMethods.CallTool, params);
  }

  /**
   * Check if server has tools capability
   */
  hasToolsCapability(): boolean {
    return this._state.capabilities?.tools !== undefined;
  }

  // ===========================================================================
  // Resources
  // ===========================================================================

  /**
   * List available resources from the server
   */
  async listResources(forceRefresh = false): Promise<Resource[]> {
    this.ensureInitialized();

    if (this.resourcesCache && !forceRefresh) {
      return this.resourcesCache;
    }

    const result = await this.session!.request<ListResourcesResult>(
      MCPMethods.ListResources
    );

    this.resourcesCache = result.resources;
    return result.resources;
  }

  /**
   * Read a resource from the server
   */
  async readResource(uri: string): Promise<ReadResourceResult> {
    this.ensureInitialized();

    const params: ReadResourceParams = { uri };

    return this.session!.request<ReadResourceResult>(
      MCPMethods.ReadResource,
      params
    );
  }

  /**
   * Check if server has resources capability
   */
  hasResourcesCapability(): boolean {
    return this._state.capabilities?.resources !== undefined;
  }

  // ===========================================================================
  // Prompts
  // ===========================================================================

  /**
   * List available prompts from the server
   */
  async listPrompts(forceRefresh = false): Promise<Prompt[]> {
    this.ensureInitialized();

    if (this.promptsCache && !forceRefresh) {
      return this.promptsCache;
    }

    const result = await this.session!.request<ListPromptsResult>(
      MCPMethods.ListPrompts
    );

    this.promptsCache = result.prompts;
    return result.prompts;
  }

  /**
   * Get a prompt from the server
   */
  async getPrompt(name: string, args?: Record<string, string>): Promise<GetPromptResult> {
    this.ensureInitialized();

    const params: GetPromptParams = {
      name,
      arguments: args,
    };

    return this.session!.request<GetPromptResult>(MCPMethods.GetPrompt, params);
  }

  /**
   * Check if server has prompts capability
   */
  hasPromptsCapability(): boolean {
    return this._state.capabilities?.prompts !== undefined;
  }

  // ===========================================================================
  // Utility
  // ===========================================================================

  /**
   * Ping the server
   */
  async ping(): Promise<void> {
    this.ensureInitialized();
    await this.session!.request(MCPMethods.Ping);
  }

  // ===========================================================================
  // Private Methods
  // ===========================================================================

  private ensureInitialized(): void {
    if (!this.session) {
      throw new Error("Not connected");
    }
    if (!this.isInitialized) {
      throw new Error("Not initialized");
    }
  }

  private handleNotification(method: string, params?: Record<string, unknown>): void {
    // Clear relevant caches on list changed notifications
    switch (method) {
      case MCPMethods.ToolsListChanged:
        this.toolsCache = null;
        break;
      case MCPMethods.ResourcesListChanged:
        this.resourcesCache = null;
        break;
      case MCPMethods.PromptsListChanged:
        this.promptsCache = null;
        break;
    }
  }

  private clearCaches(): void {
    this.toolsCache = null;
    this.resourcesCache = null;
    this.promptsCache = null;
  }
}

/**
 * Create and connect an MCP client
 */
export async function createMCPClient(
  config: MCPClientConfig
): Promise<MCPClient> {
  const client = new MCPClient(config);
  await client.connect();
  return client;
}
