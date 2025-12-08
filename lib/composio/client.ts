/**
 * Composio Client
 * Main client for interacting with Composio API
 */

// Composio API configuration
const COMPOSIO_API_BASE = "https://backend.composio.dev/api/v1";

/**
 * Composio Client Configuration
 */
export interface ComposioConfig {
  apiKey: string;
}

/**
 * Tool definition from Composio
 */
export interface ComposioTool {
  name: string;
  displayName?: string;
  description?: string;
  appName: string;
  appId: string;
  parameters: {
    type: "object";
    properties: Record<string, {
      type: string;
      description?: string;
      enum?: string[];
      required?: boolean;
    }>;
    required?: string[];
  };
}

/**
 * App/Toolkit definition
 */
export interface ComposioApp {
  name: string;
  key: string;
  description?: string;
  logo?: string;
  categories?: string[];
  authSchemes?: string[];
}

/**
 * Connected Account
 */
export interface ConnectedAccount {
  id: string;
  appName: string;
  status: "active" | "pending" | "expired" | "error";
  createdAt: string;
  entityId?: string;
}

/**
 * Connection Request Response
 */
export interface ConnectionRequest {
  connectionId: string;
  redirectUrl: string;
  status: string;
}

/**
 * Tool Execution Result
 */
export interface ToolExecutionResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

/**
 * Composio Client Class
 * Handles all interactions with Composio API
 */
export class ComposioClient {
  private apiKey: string;

  constructor(config: ComposioConfig) {
    this.apiKey = config.apiKey;
  }

  /**
   * Make authenticated request to Composio API
   */
  private async request<T>(
    method: string,
    endpoint: string,
    body?: unknown
  ): Promise<T> {
    const url = `${COMPOSIO_API_BASE}${endpoint}`;
    
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "x-api-key": this.apiKey,
    };

    const options: RequestInit = {
      method,
      headers,
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Composio API Error: ${response.status} - ${errorText}`);
    }

    return response.json();
  }

  // ============================================================================
  // Apps / Toolkits
  // ============================================================================

  /**
   * List available apps/toolkits
   */
  async listApps(): Promise<ComposioApp[]> {
    const response = await this.request<{ items: ComposioApp[] }>(
      "GET",
      "/apps"
    );
    return response.items || [];
  }

  /**
   * Get app details
   */
  async getApp(appKey: string): Promise<ComposioApp> {
    return this.request<ComposioApp>("GET", `/apps/${appKey}`);
  }

  // ============================================================================
  // Tools
  // ============================================================================

  /**
   * List tools for an app
   */
  async listTools(appName?: string): Promise<ComposioTool[]> {
    let endpoint = "/actions";
    if (appName) {
      endpoint += `?appNames=${appName}`;
    }
    
    const response = await this.request<{ items: ComposioTool[] }>(
      "GET",
      endpoint
    );
    return response.items || [];
  }

  /**
   * Get tool details
   */
  async getTool(actionName: string): Promise<ComposioTool> {
    return this.request<ComposioTool>("GET", `/actions/${actionName}`);
  }

  /**
   * Execute a tool
   */
  async executeTool(
    actionName: string,
    params: Record<string, unknown>,
    entityId: string
  ): Promise<ToolExecutionResult> {
    try {
      const response = await this.request<{ data: unknown }>(
        "POST",
        `/actions/${actionName}/execute`,
        {
          entityId,
          input: params,
        }
      );
      
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  // ============================================================================
  // Connected Accounts
  // ============================================================================

  /**
   * List connected accounts for an entity (user/org)
   */
  async listConnectedAccounts(entityId: string): Promise<ConnectedAccount[]> {
    const response = await this.request<{ items: ConnectedAccount[] }>(
      "GET",
      `/connectedAccounts?entityIds=${entityId}`
    );
    return response.items || [];
  }

  /**
   * Get connected account details
   */
  async getConnectedAccount(accountId: string): Promise<ConnectedAccount> {
    return this.request<ConnectedAccount>(
      "GET",
      `/connectedAccounts/${accountId}`
    );
  }

  /**
   * Initiate connection to an app (OAuth flow)
   */
  async initiateConnection(
    appKey: string,
    entityId: string,
    redirectUrl: string
  ): Promise<ConnectionRequest> {
    return this.request<ConnectionRequest>(
      "POST",
      "/connectedAccounts",
      {
        appName: appKey,
        entityId,
        redirectUrl,
      }
    );
  }

  /**
   * Delete a connected account
   */
  async deleteConnection(accountId: string): Promise<void> {
    await this.request("DELETE", `/connectedAccounts/${accountId}`);
  }

  /**
   * Check if entity has active connection to an app
   */
  async hasActiveConnection(entityId: string, appName: string): Promise<boolean> {
    const accounts = await this.listConnectedAccounts(entityId);
    return accounts.some(
      (acc) => acc.appName === appName && acc.status === "active"
    );
  }

  // ============================================================================
  // Entity Management
  // ============================================================================

  /**
   * Create or get an entity (used for multi-tenant setups)
   */
  async getOrCreateEntity(entityId: string): Promise<{ id: string }> {
    return this.request<{ id: string }>("POST", "/entity", { id: entityId });
  }
}

// Singleton instance
let composioClient: ComposioClient | null = null;

/**
 * Get or create Composio client instance
 */
export function getComposioClient(): ComposioClient {
  if (!composioClient) {
    const apiKey = process.env.COMPOSIO_API_KEY;
    if (!apiKey) {
      throw new Error("COMPOSIO_API_KEY environment variable is required");
    }
    composioClient = new ComposioClient({ apiKey });
  }
  return composioClient;
}

/**
 * Reset client (for testing)
 */
export function resetComposioClient(): void {
  composioClient = null;
}
