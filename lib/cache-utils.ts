import { revalidateTag, revalidatePath } from "next/cache";

/**
 * Cache tags used throughout the application
 */
export const CACHE_TAGS = {
  dashboard: "dashboard",
  leads: "leads",
  contacts: "contacts",
  accounts: "accounts",
  tasks: "tasks",
  opportunities: "opportunities",
  pipeline: "pipeline",
  documents: "documents",
  // CS tags
  tickets: "tickets",
  health: "health",
  playbooks: "playbooks",
  renewals: "renewals",
  // Marketing tags
  campaigns: "campaigns",
  segments: "segments",
  forms: "forms",
  // Custom modules
  customModules: "custom-modules",
  // Invoicing
  invoices: "invoices",
} as const;

/**
 * Revalidate caches after lead changes
 */
export function revalidateLeadCaches() {
  revalidateTag(CACHE_TAGS.leads);
  revalidateTag(CACHE_TAGS.dashboard);
  revalidateTag(CACHE_TAGS.pipeline);
  // Sales workspace paths
  revalidatePath("/sales");
  revalidatePath("/sales/leads");
  revalidatePath("/dashboard");
}

/**
 * Revalidate caches after contact changes
 */
export function revalidateContactCaches() {
  revalidateTag(CACHE_TAGS.contacts);
  revalidateTag(CACHE_TAGS.dashboard);
  // Sales workspace paths
  revalidatePath("/sales");
  revalidatePath("/sales/contacts");
  revalidatePath("/dashboard");
}

/**
 * Revalidate caches after account changes
 */
export function revalidateAccountCaches() {
  revalidateTag(CACHE_TAGS.accounts);
  revalidateTag(CACHE_TAGS.dashboard);
  // Both workspaces use accounts
  revalidatePath("/sales");
  revalidatePath("/sales/accounts");
  revalidatePath("/cs");
  revalidatePath("/cs/accounts");
  revalidatePath("/dashboard");
}

/**
 * Revalidate caches after task changes
 */
export function revalidateTaskCaches() {
  revalidateTag(CACHE_TAGS.tasks);
  revalidateTag(CACHE_TAGS.dashboard);
  // All workspaces have tasks
  revalidatePath("/sales");
  revalidatePath("/sales/tasks");
  revalidatePath("/cs");
  revalidatePath("/cs/tasks");
  revalidatePath("/marketing");
  revalidatePath("/dashboard");
}

/**
 * Revalidate caches after opportunity changes
 */
export function revalidateOpportunityCaches() {
  revalidateTag(CACHE_TAGS.opportunities);
  revalidateTag(CACHE_TAGS.dashboard);
  revalidateTag(CACHE_TAGS.pipeline);
  // Sales workspace paths
  revalidatePath("/sales");
  revalidatePath("/sales/opportunities");
  revalidatePath("/sales/pipeline");
  revalidatePath("/dashboard");
}

/**
 * Revalidate caches after document changes
 */
export function revalidateDocumentCaches() {
  revalidateTag(CACHE_TAGS.documents);
  revalidatePath("/settings/documents");
}

// =============================================================================
// INVOICING CACHE UTILS
// =============================================================================

/**
 * Revalidate caches after invoice changes
 */
export function revalidateInvoiceCaches() {
  revalidateTag(CACHE_TAGS.invoices);
  revalidateTag(CACHE_TAGS.dashboard);
  revalidateTag(CACHE_TAGS.accounts);
  // Sales workspace paths
  revalidatePath("/sales");
  revalidatePath("/sales/invoices");
  revalidatePath("/dashboard");
}

// =============================================================================
// CS WORKSPACE CACHE UTILS
// =============================================================================

/**
 * Revalidate caches after ticket changes
 */
export function revalidateTicketCaches() {
  revalidateTag(CACHE_TAGS.tickets);
  revalidateTag(CACHE_TAGS.dashboard);
  revalidatePath("/cs");
  revalidatePath("/cs/tickets");
}

/**
 * Revalidate caches after health score changes
 */
export function revalidateHealthCaches() {
  revalidateTag(CACHE_TAGS.health);
  revalidateTag(CACHE_TAGS.dashboard);
  revalidatePath("/cs");
  revalidatePath("/cs/health");
  revalidatePath("/cs/accounts");
}

/**
 * Revalidate caches after playbook changes
 */
export function revalidatePlaybookCaches() {
  revalidateTag(CACHE_TAGS.playbooks);
  revalidatePath("/cs");
  revalidatePath("/cs/playbooks");
}

/**
 * Revalidate caches after renewal changes
 */
export function revalidateRenewalCaches() {
  revalidateTag(CACHE_TAGS.renewals);
  revalidateTag(CACHE_TAGS.dashboard);
  revalidatePath("/cs");
}

// =============================================================================
// MARKETING WORKSPACE CACHE UTILS
// =============================================================================

/**
 * Revalidate caches after campaign changes
 */
export function revalidateCampaignCaches() {
  revalidateTag(CACHE_TAGS.campaigns);
  revalidateTag(CACHE_TAGS.dashboard);
  revalidatePath("/marketing");
  revalidatePath("/marketing/campaigns");
}

/**
 * Revalidate caches after segment changes
 */
export function revalidateSegmentCaches() {
  revalidateTag(CACHE_TAGS.segments);
  revalidatePath("/marketing");
  revalidatePath("/marketing/segments");
}

/**
 * Revalidate caches after form changes
 */
export function revalidateFormCaches() {
  revalidateTag(CACHE_TAGS.forms);
  revalidateTag(CACHE_TAGS.dashboard);
  revalidatePath("/marketing");
  revalidatePath("/marketing/forms");
}

// =============================================================================
// CUSTOM MODULES CACHE UTILS
// =============================================================================

/**
 * Revalidate caches after custom module changes
 */
export function revalidateCustomModuleCaches() {
  revalidateTag(CACHE_TAGS.customModules);
  revalidatePath("/settings/custom-modules");
}

// =============================================================================
// GLOBAL UTILS
// =============================================================================

/**
 * Revalidate all caches (use sparingly)
 */
export function revalidateAllCaches() {
  Object.values(CACHE_TAGS).forEach((tag) => revalidateTag(tag));
  // All workspace dashboards
  revalidatePath("/sales");
  revalidatePath("/cs");
  revalidatePath("/marketing");
  revalidatePath("/dashboard");
  // Sales
  revalidatePath("/sales/leads");
  revalidatePath("/sales/contacts");
  revalidatePath("/sales/accounts");
  revalidatePath("/sales/tasks");
  revalidatePath("/sales/opportunities");
  revalidatePath("/sales/pipeline");
  revalidatePath("/sales/invoices");
  // CS
  revalidatePath("/cs/tickets");
  revalidatePath("/cs/health");
  revalidatePath("/cs/accounts");
  revalidatePath("/cs/playbooks");
  // Marketing
  revalidatePath("/marketing/campaigns");
  revalidatePath("/marketing/segments");
  revalidatePath("/marketing/forms");
  // Settings
  revalidatePath("/settings/documents");
  revalidatePath("/settings/custom-modules");
}
