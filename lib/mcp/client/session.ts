/**
 * MCP Client Session
 * Handles the lifecycle of an MCP connection including initialization
 */

import {
  JSONRPCRequest,
  JSONRPCResponse,
  JSONRPCNotification,
  JSONRPCMessage,
  InitializeParams,
  InitializeResult,
  MCPMethods,
  LATEST_PROTOCOL_VERSION,
  SUPPORTED_PROTOCOL_VERSIONS,
  ServerCapabilities,
} from "../protocol";
import { Transport } from "./transport/base";
import { MCPError, TimeoutError } from "../protocol/errors";
import { DEFAULT_CLIENT_CAPABILITIES, Y_CRM_CLIENT_INFO } from "../protocol/capabilities";

export interface MCPSessionConfig {
  requestTimeout?: number;
  onNotification?: (method: string, params?: Record<string, unknown>) => void;
}

export interface PendingRequest {
  resolve: (result: unknown) => void;
  reject: (error: Error) => void;
  timeout: ReturnType<typeof setTimeout>;
}

/**
 * MCP Client Session
 * Manages JSON-RPC communication and protocol state
 */
export class MCPSession {
  private transport: Transport;
  private config: MCPSessionConfig;
  private requestId: number = 0;
  private pendingRequests: Map<string | number, PendingRequest> = new Map();
  private initialized: boolean = false;
  private serverCapabilities: ServerCapabilities | null = null;
  private protocolVersion: string | null = null;

  constructor(transport: Transport, config: MCPSessionConfig = {}) {
    this.transport = transport;
    this.config = {
      requestTimeout: config.requestTimeout ?? 30000,
      onNotification: config.onNotification,
    };

    // Listen for messages
    this.transport.on("message", this.handleMessage.bind(this));
    this.transport.on("error", this.handleError.bind(this));
    this.transport.on("close", this.handleClose.bind(this));
  }

  get isInitialized(): boolean {
    return this.initialized;
  }

  get capabilities(): ServerCapabilities | null {
    return this.serverCapabilities;
  }

  /**
   * Initialize the MCP session
   * Performs capability negotiation with the server
   */
  async initialize(): Promise<InitializeResult> {
    if (this.initialized) {
      throw new Error("Session already initialized");
    }

    // Start transport if needed
    if (this.transport.state !== "connected") {
      await this.transport.start();
    }

    // Send initialize request
    const params: InitializeParams = {
      protocolVersion: LATEST_PROTOCOL_VERSION,
      capabilities: DEFAULT_CLIENT_CAPABILITIES,
      clientInfo: Y_CRM_CLIENT_INFO,
    };

    const result = await this.request<InitializeResult>(
      MCPMethods.Initialize,
      params as unknown as Record<string, unknown>
    );

    // Validate protocol version
    if (!SUPPORTED_PROTOCOL_VERSIONS.includes(result.protocolVersion as typeof SUPPORTED_PROTOCOL_VERSIONS[number])) {
      throw new Error(`Unsupported protocol version: ${result.protocolVersion}`);
    }

    this.protocolVersion = result.protocolVersion;
    this.serverCapabilities = result.capabilities;
    this.initialized = true;

    // Send initialized notification
    await this.notify(MCPMethods.Initialized);

    console.log("[MCP Session] Initialized with server:", result.serverInfo);

    return result;
  }

  /**
   * Send a JSON-RPC request and wait for response
   */
  async request<T = unknown>(
    method: string,
    params?: Record<string, unknown>
  ): Promise<T> {
    const id = ++this.requestId;

    const request: JSONRPCRequest = {
      jsonrpc: "2.0",
      id,
      method,
      params,
    };

    return new Promise<T>((resolve, reject) => {
      // Set timeout
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new TimeoutError(this.config.requestTimeout!));
      }, this.config.requestTimeout);

      // Store pending request
      this.pendingRequests.set(id, {
        resolve: resolve as (result: unknown) => void,
        reject,
        timeout,
      });

      // Send request
      this.transport.send(request).catch((error) => {
        clearTimeout(timeout);
        this.pendingRequests.delete(id);
        reject(error);
      });
    });
  }

  /**
   * Send a JSON-RPC notification (no response expected)
   */
  async notify(method: string, params?: Record<string, unknown>): Promise<void> {
    const notification: JSONRPCNotification = {
      jsonrpc: "2.0",
      method,
      params,
    };

    await this.transport.send(notification);
  }

  /**
   * Handle incoming messages
   */
  private handleMessage(message: JSONRPCMessage): void {
    // Check if it's a response
    if ("id" in message && message.id !== undefined) {
      const response = message as JSONRPCResponse;
      const pending = this.pendingRequests.get(response.id);

      if (pending) {
        clearTimeout(pending.timeout);
        this.pendingRequests.delete(response.id);

        if (response.error) {
          pending.reject(new MCPError(response.error));
        } else {
          pending.resolve(response.result);
        }
      }
    }
    // Check if it's a notification
    else if ("method" in message && !("id" in message)) {
      const notification = message as JSONRPCNotification;
      this.handleNotification(notification);
    }
  }

  /**
   * Handle incoming notifications
   */
  private handleNotification(notification: JSONRPCNotification): void {
    console.log("[MCP Session] Notification:", notification.method);

    // Call user handler if provided
    if (this.config.onNotification) {
      this.config.onNotification(notification.method, notification.params);
    }

    // Handle specific notifications
    switch (notification.method) {
      case MCPMethods.ToolsListChanged:
        console.log("[MCP Session] Tools list changed");
        break;
      case MCPMethods.ResourcesListChanged:
        console.log("[MCP Session] Resources list changed");
        break;
      case MCPMethods.PromptsListChanged:
        console.log("[MCP Session] Prompts list changed");
        break;
      case MCPMethods.LogMessage:
        console.log("[MCP Session] Log:", notification.params);
        break;
      case MCPMethods.Progress:
        console.log("[MCP Session] Progress:", notification.params);
        break;
    }
  }

  /**
   * Handle transport errors
   */
  private handleError(error: Error): void {
    console.error("[MCP Session] Transport error:", error);

    // Reject all pending requests
    for (const [id, pending] of this.pendingRequests) {
      clearTimeout(pending.timeout);
      pending.reject(error);
      this.pendingRequests.delete(id);
    }
  }

  /**
   * Handle transport close
   */
  private handleClose(): void {
    console.log("[MCP Session] Connection closed");
    this.initialized = false;

    // Reject all pending requests
    for (const [id, pending] of this.pendingRequests) {
      clearTimeout(pending.timeout);
      pending.reject(new Error("Connection closed"));
      this.pendingRequests.delete(id);
    }
  }

  /**
   * Close the session
   */
  async close(): Promise<void> {
    await this.transport.close();
    this.initialized = false;
  }
}
