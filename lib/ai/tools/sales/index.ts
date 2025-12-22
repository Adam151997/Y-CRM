/**
 * Sales Workspace Tools
 *
 * Tools for managing leads, contacts, accounts, and opportunities
 */

import { createLeadTools } from "./leads";
import { createContactTools } from "./contacts";
import { createAccountTools } from "./accounts";
import { createOpportunityTools } from "./opportunities";

/**
 * Create all sales tools
 */
export function createSalesTools(orgId: string, userId: string) {
  return {
    ...createLeadTools(orgId, userId),
    ...createContactTools(orgId, userId),
    ...createAccountTools(orgId, userId),
    ...createOpportunityTools(orgId, userId),
  };
}

// Re-export individual tool creators for selective imports
export { createLeadTools } from "./leads";
export { createContactTools } from "./contacts";
export { createAccountTools } from "./accounts";
export { createOpportunityTools } from "./opportunities";
