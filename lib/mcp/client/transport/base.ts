/**
 * MCP Transport - Base Interface
 * Defines the contract for all transport implementations
 */

import { JSONRPCMessage } from "../../protocol";

export type TransportState = "disconnected" | "connecting" | "connected" | "error";

export interface TransportEvents {
  message: (message: JSONRPCMessage) => void;
  error: (error: Error) => void;
  close: () => void;
  stateChange: (state: TransportState) => void;
}

export type TransportEventType = keyof TransportEvents;

/**
 * Base Transport Interface
 * All transports (stdio, SSE, WebSocket) must implement this
 */
export interface Transport {
  /**
   * Current connection state
   */
  readonly state: TransportState;

  /**
   * Start the transport connection
   */
  start(): Promise<void>;

  /**
   * Send a message through the transport
   */
  send(message: JSONRPCMessage): Promise<void>;

  /**
   * Close the transport connection
   */
  close(): Promise<void>;

  /**
   * Register an event listener
   */
  on<T extends TransportEventType>(event: T, listener: TransportEvents[T]): void;

  /**
   * Remove an event listener
   */
  off<T extends TransportEventType>(event: T, listener: TransportEvents[T]): void;
}

/**
 * Base Transport Class
 * Provides common event handling functionality
 */
export abstract class BaseTransport implements Transport {
  protected _state: TransportState = "disconnected";
  protected listeners: Map<TransportEventType, Set<TransportEvents[keyof TransportEvents]>> = new Map();

  get state(): TransportState {
    return this._state;
  }

  protected setState(state: TransportState): void {
    if (this._state !== state) {
      this._state = state;
      this.emit("stateChange", state);
    }
  }

  on<T extends TransportEventType>(event: T, listener: TransportEvents[T]): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(listener);
  }

  off<T extends TransportEventType>(event: T, listener: TransportEvents[T]): void {
    this.listeners.get(event)?.delete(listener);
  }

  protected emit<T extends TransportEventType>(
    event: T,
    ...args: Parameters<TransportEvents[T]>
  ): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach((listener) => {
        try {
          (listener as (...args: unknown[]) => void)(...args);
        } catch (error) {
          console.error(`Error in transport event listener (${event}):`, error);
        }
      });
    }
  }

  abstract start(): Promise<void>;
  abstract send(message: JSONRPCMessage): Promise<void>;
  abstract close(): Promise<void>;
}

/**
 * Transport Configuration
 */
export interface StdioTransportConfig {
  type: "stdio";
  command: string;
  args?: string[];
  env?: Record<string, string>;
  cwd?: string;
}

export interface SSETransportConfig {
  type: "sse";
  url: string;
  headers?: Record<string, string>;
}

export interface WebSocketTransportConfig {
  type: "websocket";
  url: string;
  headers?: Record<string, string>;
}

export type TransportConfig = StdioTransportConfig | SSETransportConfig | WebSocketTransportConfig;

/**
 * Create a transport from config
 */
export async function createTransport(config: TransportConfig): Promise<Transport> {
  switch (config.type) {
    case "stdio":
      const { StdioTransport } = await import("./stdio");
      return new StdioTransport(config);
    case "sse":
      const { SSETransport } = await import("./sse");
      return new SSETransport(config);
    case "websocket":
      throw new Error("WebSocket transport not yet implemented");
    default:
      throw new Error(`Unknown transport type: ${(config as TransportConfig).type}`);
  }
}
