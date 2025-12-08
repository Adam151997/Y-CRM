/**
 * MCP Server SSE Transport
 * Handles HTTP-based MCP connections using Server-Sent Events
 * 
 * This is designed to work with Next.js API routes
 */

import { JSONRPCMessage } from "../../protocol/types";
import { ServerConnection } from "./base";

/**
 * SSE Connection
 * Represents a single SSE client connection
 */
export class SSEConnection implements ServerConnection {
  public readonly id: string;
  private encoder: TextEncoder;
  private controller: ReadableStreamDefaultController<Uint8Array> | null = null;
  private messageHandler: ((message: JSONRPCMessage) => void) | null = null;
  private closeHandler: (() => void) | null = null;
  private _closed: boolean = false;

  constructor(id: string) {
    this.id = id;
    this.encoder = new TextEncoder();
  }

  get closed(): boolean {
    return this._closed;
  }

  /**
   * Create the SSE stream for this connection
   */
  createStream(): ReadableStream<Uint8Array> {
    return new ReadableStream({
      start: (controller) => {
        this.controller = controller;
        
        // Send session ID
        this.sendEvent("session", { sessionId: this.id });
      },
      cancel: () => {
        this.handleClose();
      },
    });
  }

  /**
   * Send a JSON-RPC message to the client
   */
  async send(message: JSONRPCMessage): Promise<void> {
    if (this._closed || !this.controller) {
      throw new Error("Connection closed");
    }

    const data = `event: message\ndata: ${JSON.stringify(message)}\n\n`;
    this.controller.enqueue(this.encoder.encode(data));
  }

  /**
   * Send a custom event to the client
   */
  async sendEvent(event: string, data: unknown): Promise<void> {
    if (this._closed || !this.controller) {
      throw new Error("Connection closed");
    }

    const eventData = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    this.controller.enqueue(this.encoder.encode(eventData));
  }

  /**
   * Handle incoming message from the client (via POST request)
   */
  handleIncomingMessage(message: JSONRPCMessage): void {
    if (this.messageHandler) {
      this.messageHandler(message);
    }
  }

  /**
   * Register message handler
   */
  onMessage(handler: (message: JSONRPCMessage) => void): void {
    this.messageHandler = handler;
  }

  /**
   * Register close handler
   */
  onClose(handler: () => void): void {
    this.closeHandler = handler;
  }

  /**
   * Close the connection
   */
  async close(): Promise<void> {
    if (this._closed) return;

    try {
      if (this.controller) {
        const closeData = `event: close\ndata: {}\n\n`;
        this.controller.enqueue(this.encoder.encode(closeData));
        this.controller.close();
      }
    } catch {
      // Already closed
    }

    this.handleClose();
  }

  private handleClose(): void {
    if (this._closed) return;
    
    this._closed = true;
    this.controller = null;

    if (this.closeHandler) {
      this.closeHandler();
    }
  }
}

/**
 * SSE Connection Manager
 * Manages multiple SSE connections for the MCP server
 */
export class SSEConnectionManager {
  private connections: Map<string, SSEConnection> = new Map();

  /**
   * Create a new SSE connection
   */
  createConnection(): SSEConnection {
    const id = crypto.randomUUID();
    const connection = new SSEConnection(id);
    this.connections.set(id, connection);

    connection.onClose(() => {
      this.connections.delete(id);
    });

    return connection;
  }

  /**
   * Get a connection by ID
   */
  getConnection(id: string): SSEConnection | undefined {
    return this.connections.get(id);
  }

  /**
   * Get all active connections
   */
  getConnections(): SSEConnection[] {
    return Array.from(this.connections.values());
  }

  /**
   * Close a connection by ID
   */
  async closeConnection(id: string): Promise<void> {
    const connection = this.connections.get(id);
    if (connection) {
      await connection.close();
    }
  }

  /**
   * Close all connections
   */
  async closeAll(): Promise<void> {
    const closePromises = Array.from(this.connections.values()).map((conn) =>
      conn.close()
    );
    await Promise.all(closePromises);
    this.connections.clear();
  }

  /**
   * Get connection count
   */
  get count(): number {
    return this.connections.size;
  }
}

// Global connection manager (singleton)
let connectionManager: SSEConnectionManager | null = null;

export function getSSEConnectionManager(): SSEConnectionManager {
  if (!connectionManager) {
    connectionManager = new SSEConnectionManager();
  }
  return connectionManager;
}
