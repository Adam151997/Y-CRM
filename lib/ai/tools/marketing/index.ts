/**
 * Marketing Workspace Tools
 *
 * Tools for managing campaigns, segments, and forms
 */

import { createCampaignTools } from "./campaigns";
import { createSegmentTools } from "./segments";
import { createFormTools } from "./forms";

/**
 * Create all marketing tools
 */
export function createMarketingTools(orgId: string, userId: string) {
  return {
    ...createCampaignTools(orgId, userId),
    ...createSegmentTools(orgId, userId),
    ...createFormTools(orgId, userId),
  };
}

// Re-export individual tool creators
export { createCampaignTools } from "./campaigns";
export { createSegmentTools } from "./segments";
export { createFormTools } from "./forms";
