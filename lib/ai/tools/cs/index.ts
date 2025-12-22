/**
 * Customer Success Workspace Tools
 *
 * Tools for managing tickets, health scores, playbooks, and renewals
 */

import { createTicketTools } from "./tickets";
import { createHealthTools } from "./health";
import { createPlaybookTools } from "./playbooks";
import { createRenewalTools } from "./renewals";

/**
 * Create all CS tools
 */
export function createCSTools(orgId: string, userId: string) {
  return {
    ...createTicketTools(orgId, userId),
    ...createHealthTools(orgId),
    ...createPlaybookTools(orgId, userId),
    ...createRenewalTools(orgId, userId),
  };
}

// Re-export individual tool creators for selective imports
export { createTicketTools } from "./tickets";
export { createHealthTools } from "./health";
export { createPlaybookTools } from "./playbooks";
export { createRenewalTools } from "./renewals";
