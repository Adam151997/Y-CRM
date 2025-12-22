/**
 * Integration Tools
 *
 * Tools for Google (Gmail, Calendar), Slack, and Report generation
 */

import { createGoogleTools } from "./google";
import { createSlackTools } from "./slack";
import { createReportTools } from "./reports";

/**
 * Create all integration tools
 */
export function createIntegrationTools(orgId: string, userId: string) {
  return {
    ...createGoogleTools(orgId),
    ...createSlackTools(orgId),
    ...createReportTools(orgId, userId),
  };
}

// Re-export individual tool creators
export { createGoogleTools } from "./google";
export { createSlackTools } from "./slack";
export { createReportTools } from "./reports";
