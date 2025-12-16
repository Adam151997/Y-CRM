/**
 * Standardized AI Tool Response Types
 * Provides consistent error handling across all AI tools
 */

export type ErrorCode = 
  | "NOT_FOUND"
  | "DUPLICATE" 
  | "VALIDATION"
  | "PERMISSION"
  | "INTEGRATION_NOT_CONNECTED"
  | "RATE_LIMIT"
  | "UNKNOWN";

export interface ToolSuccessResponse {
  success: true;
  message: string;
  [key: string]: unknown;
}

export interface ToolErrorResponse {
  success: false;
  errorCode: ErrorCode;
  message: string;
  details?: Record<string, unknown>;
}

export type ToolResponse = ToolSuccessResponse | ToolErrorResponse;

/**
 * Create a standardized error response
 */
export function createErrorResponse(
  errorCode: ErrorCode,
  message: string,
  details?: Record<string, unknown>
): ToolErrorResponse {
  return {
    success: false,
    errorCode,
    message,
    ...(details && { details }),
  };
}

/**
 * Create a standardized success response
 */
export function createSuccessResponse(
  message: string,
  data?: Record<string, unknown>
): ToolSuccessResponse {
  return {
    success: true,
    message,
    ...data,
  };
}

/**
 * Handle and format errors from tool execution
 */
export function handleToolError(error: unknown, toolName: string): ToolErrorResponse {
  console.error(`[Tool:${toolName}] Error:`, error);
  
  if (error instanceof Error) {
    // Check for specific error types
    if (error.message.includes("not found") || error.message.includes("NotFound")) {
      return createErrorResponse("NOT_FOUND", error.message);
    }
    if (error.message.includes("duplicate") || error.message.includes("unique constraint")) {
      return createErrorResponse("DUPLICATE", error.message);
    }
    if (error.message.includes("permission") || error.message.includes("unauthorized")) {
      return createErrorResponse("PERMISSION", error.message);
    }
    if (error.message.includes("rate limit")) {
      return createErrorResponse("RATE_LIMIT", error.message);
    }
    
    return createErrorResponse("UNKNOWN", error.message);
  }
  
  return createErrorResponse("UNKNOWN", "An unexpected error occurred");
}

/**
 * Format tool response for user-friendly display
 */
export function formatToolResponseForUser(response: ToolResponse): string {
  if (response.success) {
    return response.message;
  }
  
  // User-friendly error messages
  switch (response.errorCode) {
    case "NOT_FOUND":
      return `Could not find the requested item: ${response.message}`;
    case "DUPLICATE":
      return `This item already exists: ${response.message}`;
    case "VALIDATION":
      return `Invalid input: ${response.message}`;
    case "PERMISSION":
      return `You don't have permission: ${response.message}`;
    case "INTEGRATION_NOT_CONNECTED":
      return `Integration not connected: ${response.message}`;
    case "RATE_LIMIT":
      return `Too many requests. Please try again later.`;
    default:
      return `Error: ${response.message}`;
  }
}
