/**
 * Global Tools (Available in All Workspaces)
 *
 * Tools for tasks, notes, dashboard, documents, semantic search, data export,
 * relationships, deduplication, lookups, activity timeline, and analytics
 */

import { createTaskTools } from "./tasks";
import { createNoteTools } from "./notes";
import { createDashboardTools } from "./dashboard";
import { createDocumentTools } from "./documents";
import { createSearchTools } from "./search";
import { createExportTools } from "./export";
import { createRelationshipTools } from "./relationships";
import { createLookupTools } from "./lookups";
import { createActivityTools } from "./activity";
import { createAnalyticsTools } from "./analytics";
import { createWorkflowTools } from "./workflows";

/**
 * Create all global tools
 */
export function createGlobalTools(orgId: string, userId: string) {
  return {
    ...createTaskTools(orgId, userId),
    ...createNoteTools(orgId, userId),
    ...createDashboardTools(orgId),
    ...createDocumentTools(orgId),
    ...createSearchTools(orgId),
    ...createExportTools(orgId),
    ...createRelationshipTools(orgId, userId),
    ...createLookupTools(orgId),
    ...createActivityTools(orgId),
    ...createAnalyticsTools(orgId),
    ...createWorkflowTools(orgId, userId),
  };
}

// Re-export individual tool creators
export { createTaskTools } from "./tasks";
export { createNoteTools } from "./notes";
export { createDashboardTools } from "./dashboard";
export { createDocumentTools } from "./documents";
export { createSearchTools } from "./search";
export { createExportTools } from "./export";
export { createRelationshipTools } from "./relationships";
export { createLookupTools } from "./lookups";
export { createActivityTools } from "./activity";
export { createAnalyticsTools } from "./analytics";
export { createWorkflowTools } from "./workflows";
