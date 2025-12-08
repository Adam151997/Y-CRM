/**
 * MCP Server Transport - Base Interface
 * Server-side transports for handling incoming MCP connections
 */

import { JSONRPCMessage } from "../../protocol";

export type ServerTransportState = "idle" | "running" | "error";

export interface ServerTransportEvents {
  connection: (connection: ServerConnection) => void;
  error: (error: Error) => void;
  close: () => void;
}

export type ServerTransportEventType = keyof ServerTransportEvents;

/**
 * Server Connection Interface
 * Represents a single client connection to the server
 */
export interface ServerConnection {
  id: string;
  send(message: JSONRPCMessage): Promise<void>;
  close(): Promise<void>;
  onMessage(handler: (message: JSONRPCMessage) => void): void;
  onClose(handler: () => void): void;
}

/**
 * Server Transport Interface
 * Listens for incoming connections
 */
export interface ServerTransport {
  readonly state: ServerTransportState;
  start(): Promise<void>;
  stop(): Promise<void>;
  on<T extends ServerTransportEventType>(
    event: T,
    listener: ServerTransportEvents[T]
  ): void;
  off<T extends ServerTransportEventType>(
    event: T,
    listener: ServerTransportEvents[T]
  ): void;
}

/**
 * Base Server Transport Class
 */
export abstract class BaseServerTransport implements ServerTransport {
  protected _state: ServerTransportState = "idle";
  protected listeners: Map<
    ServerTransportEventType,
    Set<ServerTransportEvents[keyof ServerTransportEvents]>
  > = new Map();

  get state(): ServerTransportState {
    return this._state;
  }

  protected setState(state: ServerTransportState): void {
    this._state = state;
  }

  on<T extends ServerTransportEventType>(
    event: T,
    listener: ServerTransportEvents[T]
  ): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(listener);
  }

  off<T extends ServerTransportEventType>(
    event: T,
    listener: ServerTransportEvents[T]
  ): void {
    this.listeners.get(event)?.delete(listener);
  }

  protected emit<T extends ServerTransportEventType>(
    event: T,
    ...args: Parameters<ServerTransportEvents[T]>
  ): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach((listener) => {
        try {
          (listener as (...args: unknown[]) => void)(...args);
        } catch (error) {
          console.error(`Error in server transport event listener (${event}):`, error);
        }
      });
    }
  }

  abstract start(): Promise<void>;
  abstract stop(): Promise<void>;
}
