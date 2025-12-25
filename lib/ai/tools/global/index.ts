/**
 * Global Tools (Available in All Workspaces)
 *
 * Tools for tasks, notes, dashboard, documents, semantic search, data export,
 * relationships, deduplication, and lookups
 */

import { createTaskTools } from "./tasks";
import { createNoteTools } from "./notes";
import { createDashboardTools } from "./dashboard";
import { createDocumentTools } from "./documents";
import { createSearchTools } from "./search";
import { createExportTools } from "./export";
import { createRelationshipTools } from "./relationships";
import { createLookupTools } from "./lookups";

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
