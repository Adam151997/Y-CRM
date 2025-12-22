/**
 * Global Tools (Available in All Workspaces)
 *
 * Tools for tasks, notes, dashboard, documents, and semantic search
 */

import { createTaskTools } from "./tasks";
import { createNoteTools } from "./notes";
import { createDashboardTools } from "./dashboard";
import { createDocumentTools } from "./documents";
import { createSearchTools } from "./search";

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
  };
}

// Re-export individual tool creators
export { createTaskTools } from "./tasks";
export { createNoteTools } from "./notes";
export { createDashboardTools } from "./dashboard";
export { createDocumentTools } from "./documents";
export { createSearchTools } from "./search";
