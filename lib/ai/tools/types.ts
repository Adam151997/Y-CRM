/**
 * Shared types for AI tools
 */

import { z } from "zod";

/**
 * Standard result returned by all tools
 */
export interface ToolResult {
  success: boolean;
  message?: string;
  errorCode?: ToolErrorCode;
  [key: string]: unknown;
}

/**
 * Expanded error codes for better error handling
 */
export type ToolErrorCode =
  | "NOT_FOUND"           // Entity not found
  | "DUPLICATE"           // Duplicate entry detected
  | "VALIDATION"          // General validation error
  | "PERMISSION"          // User lacks permission
  | "INTEGRATION_NOT_CONNECTED"  // External integration not connected
  | "INVALID_EMAIL"       // Email format validation failed
  | "INVALID_PHONE"       // Phone format validation failed
  | "INVALID_URL"         // URL format validation failed
  | "INVALID_DATE"        // Date parsing/validation failed
  | "MISSING_REQUIRED"    // Required field missing
  | "CONSTRAINT_VIOLATION" // Database constraint violated
  | "RATE_LIMIT"          // Rate limit exceeded
  | "TIMEOUT"             // Operation timed out
  | "BULK_PARTIAL"        // Bulk operation partially succeeded
  | "AMBIGUOUS_MATCH"     // Multiple matches found, need clarification
  | "INVALID_STATUS_TRANSITION"; // Invalid status change

/**
 * Tool module interface - each category exports this
 */
export interface ToolModule {
  createTools(orgId: string, userId: string): Record<string, unknown>;
}

/**
 * Tool categories for dynamic loading
 */
export type ToolCategory =
  | "sales"
  | "cs"
  | "marketing"
  | "global"
  | "custom-modules"
  | "integrations";

/**
 * Common pagination schema used by search tools
 */
export const paginationSchema = {
  limit: z.number().min(1).max(20).optional().describe("Maximum results (1-20, default 5)"),
};

/**
 * Common assignment schema for tools that support user assignment
 */
export const assignmentSchema = {
  assignTo: z.string().optional().describe("Assign to team member by name, email, or 'me' (e.g., 'Mike', 'sarah@company.com', 'me')"),
};

/**
 * Workspace options
 */
export const workspaceSchema = {
  workspace: z.enum(["sales", "cs", "marketing"]).optional().describe("Workspace: sales, cs, or marketing"),
};

/**
 * Priority levels used across multiple modules
 */
export const prioritySchema = z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional();

/**
 * Lead status options
 */
export const leadStatusSchema = z.enum(["NEW", "CONTACTED", "QUALIFIED", "CONVERTED", "LOST"]).optional();

/**
 * Lead source options
 */
export const leadSourceSchema = z.enum([
  "REFERRAL", "WEBSITE", "COLD_CALL", "LINKEDIN",
  "TRADE_SHOW", "ADVERTISEMENT", "EMAIL_CAMPAIGN", "OTHER"
]).optional();

/**
 * Account type options
 */
export const accountTypeSchema = z.enum(["PROSPECT", "CUSTOMER", "PARTNER", "VENDOR"]).optional();

/**
 * Account rating options
 */
export const accountRatingSchema = z.enum(["HOT", "WARM", "COLD"]).optional();

/**
 * Ticket status options
 */
export const ticketStatusSchema = z.enum(["NEW", "OPEN", "PENDING", "RESOLVED", "CLOSED"]).optional();

/**
 * Ticket category options
 */
export const ticketCategorySchema = z.enum(["BUG", "BILLING", "FEATURE_REQUEST", "QUESTION", "GENERAL"]).optional();

/**
 * Task status options
 */
export const taskStatusSchema = z.enum(["PENDING", "IN_PROGRESS", "COMPLETED", "CANCELLED"]).optional();

/**
 * Task type options
 */
export const taskTypeSchema = z.enum([
  "CALL", "EMAIL", "MEETING", "FOLLOW_UP", "ONBOARDING", "RENEWAL", "OTHER"
]).optional();

/**
 * Campaign type options
 */
export const campaignTypeSchema = z.enum(["EMAIL", "SOCIAL", "EVENT", "WEBINAR", "SMS", "ADS"]);

/**
 * Campaign status options
 */
export const campaignStatusSchema = z.enum([
  "DRAFT", "SCHEDULED", "ACTIVE", "PAUSED", "COMPLETED", "CANCELLED"
]).optional();

/**
 * Renewal status options
 */
export const renewalStatusSchema = z.enum([
  "UPCOMING", "IN_PROGRESS", "RENEWED", "CHURNED", "DOWNGRADED", "EXPANDED"
]);

/**
 * Document type options
 */
export const documentTypeSchema = z.enum(["CONTRACT", "PROPOSAL", "INVOICE", "PRESENTATION", "OTHER"]).optional();

/**
 * Custom field type options
 */
export const customFieldTypeSchema = z.enum([
  "TEXT", "NUMBER", "DATE", "SELECT", "MULTISELECT",
  "BOOLEAN", "URL", "EMAIL", "PHONE", "TEXTAREA", "CURRENCY", "PERCENT"
]);

/**
 * Built-in modules that support custom fields
 */
export const builtInModuleSchema = z.enum(["LEAD", "CONTACT", "ACCOUNT", "OPPORTUNITY"]).optional();

/**
 * Playbook trigger options
 */
export const playbookTriggerSchema = z.enum([
  "MANUAL", "NEW_CUSTOMER", "RENEWAL_APPROACHING", "HEALTH_DROP", "TICKET_ESCALATION"
]).optional();

/**
 * Email validation schema with helpful error message
 */
export const emailSchema = z.string().email("Invalid email format (e.g., 'john@company.com')").optional();

/**
 * URL validation schema
 */
export const urlSchema = z.string().url("Invalid URL format (e.g., 'https://example.com')").optional();

/**
 * Phone validation schema (flexible format)
 */
export const phoneSchema = z.string()
  .regex(/^[\d\s\-\+\(\)\.]+$/, "Invalid phone format (e.g., '+1 555-123-4567')")
  .optional();

/**
 * Standardized search limit with better default
 */
export const searchLimitSchema = z.number()
  .min(1)
  .max(50)
  .default(10)
  .describe("Maximum results to return (1-50, default 10)");

/**
 * Bulk operation result for individual records
 */
export interface BulkRecordResult {
  index: number;
  success: boolean;
  id?: string;
  error?: string;
  errorCode?: ToolErrorCode;
}

/**
 * Bulk operation summary result
 */
export interface BulkOperationResult extends ToolResult {
  totalRequested: number;
  successCount: number;
  failureCount: number;
  results: BulkRecordResult[];
}

/**
 * Common entity reference for linking
 */
export const entityReferenceSchema = z.object({
  entityType: z.enum(["LEAD", "CONTACT", "ACCOUNT", "OPPORTUNITY", "TICKET"]),
  entityId: z.string().uuid(),
});

/**
 * Date range schema for filtering
 */
export const dateRangeSchema = z.object({
  startDate: z.string().optional().describe("Start date (ISO format or natural language, e.g., '2024-01-01' or 'last month')"),
  endDate: z.string().optional().describe("End date (ISO format or natural language, e.g., '2024-12-31' or 'today')"),
});
