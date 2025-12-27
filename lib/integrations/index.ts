/**
 * Integrations Module
 * Regular integrations (webhooks, API connections)
 */

/**
 * Integration types
 */
export type IntegrationType = "webhook_outgoing" | "webhook_incoming" | "api";

export interface IntegrationConfig {
  url?: string;
  headers?: Record<string, string>;
  authType?: "none" | "api_key" | "bearer" | "basic";
  authConfig?: {
    apiKey?: string;
    bearerToken?: string;
    username?: string;
    password?: string;
    headerName?: string;
  };
  events?: string[];
  payloadTemplate?: string;
  retryConfig?: {
    maxRetries: number;
    retryDelayMs: number;
  };
}

/**
 * Webhook event types that can trigger outgoing webhooks
 */
export const WEBHOOK_EVENTS = [
  // Invoices / Orders
  { key: "invoice.created", label: "Invoice Created", module: "invoices" },
  { key: "invoice.updated", label: "Invoice Updated", module: "invoices" },
  { key: "invoice.paid", label: "Invoice Paid", module: "invoices" },
  { key: "invoice.cancelled", label: "Invoice Cancelled", module: "invoices" },

  // Leads
  { key: "lead.created", label: "Lead Created", module: "leads" },
  { key: "lead.updated", label: "Lead Updated", module: "leads" },
  { key: "lead.converted", label: "Lead Converted", module: "leads" },

  // Contacts
  { key: "contact.created", label: "Contact Created", module: "contacts" },
  { key: "contact.updated", label: "Contact Updated", module: "contacts" },

  // Accounts
  { key: "account.created", label: "Account Created", module: "accounts" },
  { key: "account.updated", label: "Account Updated", module: "accounts" },

  // Opportunities / Deals
  { key: "opportunity.created", label: "Opportunity Created", module: "opportunities" },
  { key: "opportunity.updated", label: "Opportunity Updated", module: "opportunities" },
  { key: "opportunity.won", label: "Opportunity Won", module: "opportunities" },
  { key: "opportunity.lost", label: "Opportunity Lost", module: "opportunities" },

  // Tasks
  { key: "task.created", label: "Task Created", module: "tasks" },
  { key: "task.completed", label: "Task Completed", module: "tasks" },

  // Inventory
  { key: "inventory.low_stock", label: "Low Stock Alert", module: "inventory" },
  { key: "inventory.updated", label: "Inventory Updated", module: "inventory" },
] as const;

export type WebhookEventType = typeof WEBHOOK_EVENTS[number]["key"];
