/**
 * MCP Server Stdio Transport
 * Handles stdio-based MCP connections (for Claude Desktop, etc.)
 * 
 * This is used when running Y-CRM as a standalone MCP server
 */

import { JSONRPCMessage } from "../../protocol/types";
import { BaseServerTransport, ServerConnection } from "./base";

/**
 * Stdio Server Connection
 * Represents the single stdin/stdout connection
 */
export class StdioServerConnection implements ServerConnection {
  public readonly id: string = "stdio";
  private messageHandler: ((message: JSONRPCMessage) => void) | null = null;
  private closeHandler: (() => void) | null = null;
  private buffer: string = "";

  constructor() {
    // This will be initialized when transport starts
  }

  /**
   * Initialize stdin listener
   */
  initialize(): void {
    if (typeof process === "undefined" || !process.stdin) {
      throw new Error("Stdio not available");
    }

    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (data: string) => {
      this.handleData(data);
    });
    process.stdin.on("end", () => {
      this.handleClose();
    });
  }

  private handleData(data: string): void {
    this.buffer += data;

    // Process complete messages (newline-delimited JSON)
    const lines = this.buffer.split("\n");
    this.buffer = lines.pop() || "";

    for (const line of lines) {
      if (line.trim()) {
        try {
          const message = JSON.parse(line) as JSONRPCMessage;
          if (this.messageHandler) {
            this.messageHandler(message);
          }
        } catch (error) {
          console.error("[Stdio Server] Failed to parse message:", error);
        }
      }
    }
  }

  /**
   * Send a JSON-RPC message to stdout
   */
  async send(message: JSONRPCMessage): Promise<void> {
    if (typeof process === "undefined" || !process.stdout) {
      throw new Error("Stdio not available");
    }

    const data = JSON.stringify(message) + "\n";
    process.stdout.write(data);
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
    this.handleClose();
  }

  private handleClose(): void {
    if (this.closeHandler) {
      this.closeHandler();
    }
  }
}

/**
 * Stdio Server Transport
 * Single-connection transport using stdin/stdout
 */
export class StdioServerTransport extends BaseServerTransport {
  private connection: StdioServerConnection | null = null;

  async start(): Promise<void> {
    if (this._state === "running") {
      return;
    }

    // Check if we're in Node.js environment
    if (typeof process === "undefined" || !process.stdin || !process.stdout) {
      throw new Error("Stdio transport requires Node.js environment");
    }

    this.connection = new StdioServerConnection();
    this.connection.initialize();

    this._state = "running";

    // Emit the connection event
    this.emit("connection", this.connection);

    // Handle close
    this.connection.onClose(() => {
      this.emit("close");
      this._state = "idle";
    });
  }

  async stop(): Promise<void> {
    if (this.connection) {
      await this.connection.close();
      this.connection = null;
    }
    this._state = "idle";
  }
}
