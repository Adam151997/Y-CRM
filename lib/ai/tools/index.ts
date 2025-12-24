/**
 * AI Tools Registry
 *
 * Provides dynamic loading of tools based on workspace and intent.
 * This reduces schema complexity by only loading relevant tools.
 */

import type { ToolCategory } from "./types";

// Tool module imports - each module exports createTools function
import { createSalesTools } from "./sales";
import { createCSTools } from "./cs";
import { createMarketingTools } from "./marketing";
import { createGlobalTools } from "./global";
import { createCustomModuleTools } from "./custom-modules";
import { createIntegrationTools } from "./integrations";

/**
 * Tool module loaders
 */
const toolModules: Record<ToolCategory, (orgId: string, userId: string) => Record<string, unknown>> = {
  sales: createSalesTools,
  cs: createCSTools,
  marketing: createMarketingTools,
  global: createGlobalTools,
  "custom-modules": createCustomModuleTools,
  integrations: createIntegrationTools,
};

/**
 * Load tools for specified categories
 */
export function loadTools(
  categories: ToolCategory[],
  orgId: string,
  userId: string
): Record<string, unknown> {
  const tools: Record<string, unknown> = {};

  for (const category of categories) {
    const createTools = toolModules[category];
    if (createTools) {
      Object.assign(tools, createTools(orgId, userId));
    }
  }

  return tools;
}

/**
 * Get all tools (for backward compatibility)
 */
export function getAllTools(orgId: string, userId: string): Record<string, unknown> {
  return loadTools(
    ["sales", "cs", "marketing", "global", "custom-modules", "integrations"],
    orgId,
    userId
  );
}

/**
 * Get tools for a specific workspace
 */
export function getToolsForWorkspace(
  workspace: "sales" | "cs" | "marketing" | undefined,
  orgId: string,
  userId: string
): Record<string, unknown> {
  const categories: ToolCategory[] = ["global"]; // Always include global

  switch (workspace) {
    case "sales":
      categories.push("sales");
      break;
    case "cs":
      categories.push("cs", "sales"); // CS needs account tools from sales
      break;
    case "marketing":
      categories.push("marketing");
      break;
    default:
      // No specific workspace, include all main categories
      categories.push("sales", "cs", "marketing");
  }

  return loadTools(categories, orgId, userId);
}

/**
 * Primary action types for intent detection
 */
export type PrimaryAction =
  | "task"
  | "lead"
  | "contact"
  | "account"
  | "opportunity"
  | "ticket"
  | "note"
  | "campaign"
  | "segment"
  | "form"
  | "renewal"
  | "inventory"
  | "search"
  | "stats"
  | "email"
  | "calendar"
  | "slack"
  | "report"
  | "custom-module"
  | null;

/**
 * Get tools filtered by detected primary action
 * This significantly reduces schema complexity for the model
 */
export function getToolsForIntent(
  primaryAction: PrimaryAction,
  orgId: string,
  userId: string
): Record<string, unknown> {
  // Load all tools first, then filter
  const salesTools = createSalesTools(orgId, userId);
  const csTools = createCSTools(orgId, userId);
  const marketingTools = createMarketingTools(orgId, userId);
  const globalTools = createGlobalTools(orgId, userId);
  const customModuleTools = createCustomModuleTools(orgId, userId);
  const integrationTools = createIntegrationTools(orgId, userId);

  const filtered: Record<string, unknown> = {};

  switch (primaryAction) {
    case "task":
      filtered.createTask = globalTools.createTask;
      filtered.completeTask = globalTools.completeTask;
      filtered.searchTasks = globalTools.searchTasks;
      // Search tools for entity resolution
      filtered.searchLeads = salesTools.searchLeads;
      filtered.searchContacts = salesTools.searchContacts;
      filtered.searchAccounts = salesTools.searchAccounts;
      filtered.searchOpportunities = salesTools.searchOpportunities;
      break;

    case "lead":
      filtered.createLead = salesTools.createLead;
      filtered.searchLeads = salesTools.searchLeads;
      filtered.updateLead = salesTools.updateLead;
      break;

    case "contact":
      filtered.createContact = salesTools.createContact;
      filtered.searchContacts = salesTools.searchContacts;
      filtered.searchAccounts = salesTools.searchAccounts; // For linking
      break;

    case "account":
      filtered.createAccount = salesTools.createAccount;
      filtered.searchAccounts = salesTools.searchAccounts;
      break;

    case "opportunity":
      filtered.createOpportunity = salesTools.createOpportunity;
      filtered.searchOpportunities = salesTools.searchOpportunities;
      filtered.searchAccounts = salesTools.searchAccounts; // Required for accountId
      break;

    case "ticket":
      filtered.createTicket = csTools.createTicket;
      filtered.searchTickets = csTools.searchTickets;
      filtered.updateTicket = csTools.updateTicket;
      filtered.addTicketMessage = csTools.addTicketMessage;
      filtered.searchAccounts = salesTools.searchAccounts;
      filtered.searchContacts = salesTools.searchContacts;
      break;

    case "note":
      filtered.createNote = globalTools.createNote;
      filtered.searchLeads = salesTools.searchLeads;
      filtered.searchContacts = salesTools.searchContacts;
      filtered.searchAccounts = salesTools.searchAccounts;
      filtered.searchOpportunities = salesTools.searchOpportunities;
      break;

    case "campaign":
      filtered.createCampaign = marketingTools.createCampaign;
      filtered.searchCampaigns = marketingTools.searchCampaigns;
      filtered.searchSegments = marketingTools.searchSegments;
      break;

    case "segment":
      filtered.createSegment = marketingTools.createSegment;
      filtered.searchSegments = marketingTools.searchSegments;
      break;

    case "form":
      filtered.createForm = marketingTools.createForm;
      filtered.searchForms = marketingTools.searchForms;
      break;

    case "renewal":
      filtered.createRenewal = csTools.createRenewal;
      filtered.searchRenewals = csTools.searchRenewals;
      filtered.updateRenewal = csTools.updateRenewal;
      filtered.getUpcomingRenewals = csTools.getUpcomingRenewals;
      filtered.searchAccounts = salesTools.searchAccounts;
      break;

    case "inventory":
      filtered.createInventoryItem = salesTools.createInventoryItem;
      filtered.searchInventory = salesTools.searchInventory;
      filtered.checkStock = salesTools.checkStock;
      filtered.adjustStock = salesTools.adjustStock;
      filtered.getLowStockItems = salesTools.getLowStockItems;
      filtered.getInventoryStats = salesTools.getInventoryStats;
      break;

    case "search":
      filtered.searchLeads = salesTools.searchLeads;
      filtered.searchContacts = salesTools.searchContacts;
      filtered.searchAccounts = salesTools.searchAccounts;
      filtered.searchTasks = globalTools.searchTasks;
      filtered.searchOpportunities = salesTools.searchOpportunities;
      filtered.searchTickets = csTools.searchTickets;
      filtered.searchRenewals = csTools.searchRenewals;
      filtered.searchInventory = salesTools.searchInventory;
      filtered.semanticSearch = globalTools.semanticSearch;
      break;

    case "stats":
      filtered.getDashboardStats = globalTools.getDashboardStats;
      break;

    case "email":
      filtered.sendEmail = integrationTools.sendEmail;
      filtered.searchEmails = integrationTools.searchEmails;
      filtered.searchContacts = salesTools.searchContacts;
      filtered.searchLeads = salesTools.searchLeads;
      break;

    case "calendar":
      filtered.createCalendarEvent = integrationTools.createCalendarEvent;
      filtered.getUpcomingEvents = integrationTools.getUpcomingEvents;
      filtered.getTodayEvents = integrationTools.getTodayEvents;
      filtered.searchContacts = salesTools.searchContacts;
      break;

    case "slack":
      filtered.sendSlackMessage = integrationTools.sendSlackMessage;
      filtered.listSlackChannels = integrationTools.listSlackChannels;
      break;

    case "report":
      filtered.createReport = integrationTools.createReport;
      filtered.getDashboardStats = globalTools.getDashboardStats;
      break;

    case "custom-module":
      Object.assign(filtered, customModuleTools);
      break;

    default:
      // Default set for unknown intents
      filtered.getDashboardStats = globalTools.getDashboardStats;
      filtered.searchLeads = salesTools.searchLeads;
      filtered.searchContacts = salesTools.searchContacts;
      filtered.searchAccounts = salesTools.searchAccounts;
      filtered.searchTasks = globalTools.searchTasks;
      break;
  }

  return filtered;
}

/**
 * Validate tool schemas don't exceed complexity limits
 * Use this during development/testing
 */
export function validateToolSchemas(tools: Record<string, unknown>): {
  valid: boolean;
  issues: string[];
  toolCount: number;
} {
  const issues: string[] = [];
  let toolCount = 0;

  for (const [name, tool] of Object.entries(tools)) {
    toolCount++;
    // Could add schema complexity analysis here
    if (!tool) {
      issues.push(`Tool "${name}" is undefined`);
    }
  }

  // Warn if too many tools (Gemini can struggle with 50+ tools)
  if (toolCount > 50) {
    issues.push(`Too many tools (${toolCount}). Consider filtering by intent.`);
  }

  return {
    valid: issues.length === 0,
    issues,
    toolCount,
  };
}

// Re-export types
export type { ToolCategory, ToolResult, ToolModule } from "./types";
