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
  errorCode?: "NOT_FOUND" | "DUPLICATE" | "VALIDATION" | "PERMISSION" | "INTEGRATION_NOT_CONNECTED";
  [key: string]: unknown;
}

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
