/**
 * MCP SSE Transport
 * Server-Sent Events transport for HTTP-based MCP communication
 */

import { BaseTransport, SSETransportConfig } from "./base";
import { JSONRPCMessage } from "../../protocol/types";

/**
 * SSE Transport for MCP Client
 * 
 * Protocol:
 * - Client sends requests via POST to the endpoint
 * - Server sends responses and notifications via SSE stream
 */
export class SSETransport extends BaseTransport {
  private config: SSETransportConfig;
  private eventSource: EventSource | null = null;
  private sessionId: string | null = null;
  private messageEndpoint: string;
  private sseEndpoint: string;

  constructor(config: SSETransportConfig) {
    super();
    this.config = config;
    
    // Determine endpoints
    // Convention: POST to /mcp for messages, GET /mcp/sse for stream
    const baseUrl = config.url.replace(/\/$/, "");
    this.messageEndpoint = `${baseUrl}`;
    this.sseEndpoint = `${baseUrl}/sse`;
  }

  async start(): Promise<void> {
    if (this.state === "connected" || this.state === "connecting") {
      return;
    }

    this.setState("connecting");

    try {
      // Start SSE connection
      await this.connectSSE();
      this.setState("connected");
    } catch (error) {
      this.setState("error");
      throw error;
    }
  }

  private async connectSSE(): Promise<void> {
    return new Promise((resolve, reject) => {
      // Build URL with headers as query params if needed (for auth)
      let url = this.sseEndpoint;
      if (this.config.headers?.Authorization) {
        const token = this.config.headers.Authorization.replace("Bearer ", "");
        url += `?token=${encodeURIComponent(token)}`;
      }

      this.eventSource = new EventSource(url);

      this.eventSource.onopen = () => {
        console.log("[SSE Transport] Connected");
        resolve();
      };

      this.eventSource.onerror = (event) => {
        console.error("[SSE Transport] Error:", event);
        if (this.state === "connecting") {
          reject(new Error("Failed to connect to SSE endpoint"));
        } else {
          this.emit("error", new Error("SSE connection error"));
        }
      };

      // Handle session ID from server
      this.eventSource.addEventListener("session", (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data);
          this.sessionId = data.sessionId;
          console.log("[SSE Transport] Session established:", this.sessionId);
        } catch (error) {
          console.error("[SSE Transport] Failed to parse session:", error);
        }
      });

      // Handle JSON-RPC messages
      this.eventSource.addEventListener("message", (event: MessageEvent) => {
        try {
          const message = JSON.parse(event.data) as JSONRPCMessage;
          this.emit("message", message);
        } catch (error) {
          console.error("[SSE Transport] Failed to parse message:", error);
        }
      });

      // Handle close
      this.eventSource.addEventListener("close", () => {
        console.log("[SSE Transport] Server closed connection");
        this.handleClose();
      });
    });
  }

  async send(message: JSONRPCMessage): Promise<void> {
    if (this.state !== "connected") {
      throw new Error("Transport not connected");
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...this.config.headers,
    };

    if (this.sessionId) {
      headers["X-Session-ID"] = this.sessionId;
    }

    const response = await fetch(this.messageEndpoint, {
      method: "POST",
      headers,
      body: JSON.stringify(message),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to send message: ${response.status} ${error}`);
    }

    // For non-streaming responses, we might get the response directly
    // Otherwise, response comes via SSE
    const contentType = response.headers.get("Content-Type");
    if (contentType?.includes("application/json")) {
      const responseMessage = await response.json();
      if (responseMessage && "jsonrpc" in responseMessage) {
        // Emit the response as a message
        this.emit("message", responseMessage as JSONRPCMessage);
      }
    }
  }

  async close(): Promise<void> {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    this.handleClose();
  }

  private handleClose(): void {
    this.sessionId = null;
    this.setState("disconnected");
    this.emit("close");
  }
}

/**
 * SSE Transport for Server-side (Node.js)
 * Used when Y-CRM acts as an MCP Server
 */
export class SSEServerTransport extends BaseTransport {
  private encoder: TextEncoder;
  private controller: ReadableStreamDefaultController<Uint8Array> | null = null;
  private stream: ReadableStream<Uint8Array> | null = null;

  constructor() {
    super();
    this.encoder = new TextEncoder();
  }

  /**
   * Create the SSE stream
   * Returns a ReadableStream that can be used in Response
   */
  createStream(): ReadableStream<Uint8Array> {
    this.stream = new ReadableStream({
      start: (controller) => {
        this.controller = controller;
        this.setState("connected");
      },
      cancel: () => {
        this.handleClose();
      },
    });
    return this.stream;
  }

  async start(): Promise<void> {
    // For server transport, start() is called implicitly when stream is created
    if (!this.stream) {
      this.createStream();
    }
  }

  async send(message: JSONRPCMessage): Promise<void> {
    if (!this.controller || this.state !== "connected") {
      throw new Error("Transport not connected");
    }

    const data = `event: message\ndata: ${JSON.stringify(message)}\n\n`;
    this.controller.enqueue(this.encoder.encode(data));
  }

  /**
   * Send a custom event (e.g., session ID)
   */
  async sendEvent(event: string, data: unknown): Promise<void> {
    if (!this.controller || this.state !== "connected") {
      throw new Error("Transport not connected");
    }

    const eventData = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    this.controller.enqueue(this.encoder.encode(eventData));
  }

  async close(): Promise<void> {
    if (this.controller) {
      try {
        const closeData = `event: close\ndata: {}\n\n`;
        this.controller.enqueue(this.encoder.encode(closeData));
        this.controller.close();
      } catch {
        // Already closed
      }
      this.controller = null;
    }
    this.handleClose();
  }

  private handleClose(): void {
    this.setState("disconnected");
    this.emit("close");
  }
}
