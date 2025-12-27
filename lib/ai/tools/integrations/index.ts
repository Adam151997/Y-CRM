/**
 * Integration Tools
 *
 * Tools for Report generation and future integrations
 */

import { createReportTools } from "./reports";

/**
 * Create all integration tools
 */
export function createIntegrationTools(orgId: string, userId: string) {
  return {
    ...createReportTools(orgId, userId),
  };
}

// Re-export individual tool creators
export { createReportTools } from "./reports";
