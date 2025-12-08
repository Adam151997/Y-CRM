/**
 * MCP Protocol Errors
 * JSON-RPC 2.0 Error Codes + MCP-specific errors
 */

import { JSONRPCError } from "./types";

// =============================================================================
// JSON-RPC 2.0 Standard Error Codes
// =============================================================================

export const ErrorCodes = {
  // JSON-RPC 2.0 Standard Errors
  ParseError: -32700,
  InvalidRequest: -32600,
  MethodNotFound: -32601,
  InvalidParams: -32602,
  InternalError: -32603,
  
  // JSON-RPC 2.0 Server Errors (reserved range: -32000 to -32099)
  ServerError: -32000,
  
  // MCP-specific errors
  ConnectionClosed: -32001,
  RequestTimeout: -32002,
  
  // Application errors (outside reserved range)
  Unauthorized: -1,
  NotFound: -2,
  RateLimited: -3,
  ToolExecutionFailed: -4,
  ResourceNotFound: -5,
  PromptNotFound: -6,
} as const;

export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes];

// =============================================================================
// Error Factory Functions
// =============================================================================

export function createError(code: ErrorCode, message: string, data?: unknown): JSONRPCError {
  return { code, message, data };
}

export function parseError(data?: unknown): JSONRPCError {
  return createError(ErrorCodes.ParseError, "Parse error: Invalid JSON", data);
}

export function invalidRequest(message = "Invalid request"): JSONRPCError {
  return createError(ErrorCodes.InvalidRequest, message);
}

export function methodNotFound(method: string): JSONRPCError {
  return createError(ErrorCodes.MethodNotFound, `Method not found: ${method}`);
}

export function invalidParams(message: string, data?: unknown): JSONRPCError {
  return createError(ErrorCodes.InvalidParams, `Invalid params: ${message}`, data);
}

export function internalError(message = "Internal error", data?: unknown): JSONRPCError {
  return createError(ErrorCodes.InternalError, message, data);
}

export function serverError(message: string, data?: unknown): JSONRPCError {
  return createError(ErrorCodes.ServerError, message, data);
}

export function connectionClosed(reason?: string): JSONRPCError {
  return createError(
    ErrorCodes.ConnectionClosed, 
    reason ? `Connection closed: ${reason}` : "Connection closed"
  );
}

export function requestTimeout(timeoutMs: number): JSONRPCError {
  return createError(ErrorCodes.RequestTimeout, `Request timed out after ${timeoutMs}ms`);
}

export function unauthorized(message = "Unauthorized"): JSONRPCError {
  return createError(ErrorCodes.Unauthorized, message);
}

export function notFound(resource: string): JSONRPCError {
  return createError(ErrorCodes.NotFound, `Not found: ${resource}`);
}

export function rateLimited(retryAfter?: number): JSONRPCError {
  return createError(
    ErrorCodes.RateLimited, 
    "Rate limited",
    retryAfter ? { retryAfter } : undefined
  );
}

export function toolExecutionFailed(toolName: string, error: string): JSONRPCError {
  return createError(
    ErrorCodes.ToolExecutionFailed, 
    `Tool execution failed: ${toolName}`,
    { error }
  );
}

export function resourceNotFound(uri: string): JSONRPCError {
  return createError(ErrorCodes.ResourceNotFound, `Resource not found: ${uri}`);
}

export function promptNotFound(name: string): JSONRPCError {
  return createError(ErrorCodes.PromptNotFound, `Prompt not found: ${name}`);
}

// =============================================================================
// Error Classes
// =============================================================================

export class MCPError extends Error {
  public readonly code: ErrorCode;
  public readonly data?: unknown;

  constructor(error: JSONRPCError) {
    super(error.message);
    this.name = "MCPError";
    this.code = error.code as ErrorCode;
    this.data = error.data;
  }

  toJSON(): JSONRPCError {
    return {
      code: this.code,
      message: this.message,
      data: this.data,
    };
  }

  static fromError(error: unknown): MCPError {
    if (error instanceof MCPError) {
      return error;
    }
    if (error instanceof Error) {
      return new MCPError(internalError(error.message));
    }
    return new MCPError(internalError(String(error)));
  }
}

export class ConnectionError extends MCPError {
  constructor(reason?: string) {
    super(connectionClosed(reason));
    this.name = "ConnectionError";
  }
}

export class TimeoutError extends MCPError {
  constructor(timeoutMs: number) {
    super(requestTimeout(timeoutMs));
    this.name = "TimeoutError";
  }
}
