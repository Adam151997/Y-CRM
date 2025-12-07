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
} as const;

/**
 * Revalidate caches after lead changes
 */
export function revalidateLeadCaches() {
  revalidateTag(CACHE_TAGS.leads);
  revalidateTag(CACHE_TAGS.dashboard);
  revalidateTag(CACHE_TAGS.pipeline);
  revalidatePath("/leads");
  revalidatePath("/dashboard");
  revalidatePath("/pipeline");
}

/**
 * Revalidate caches after contact changes
 */
export function revalidateContactCaches() {
  revalidateTag(CACHE_TAGS.contacts);
  revalidateTag(CACHE_TAGS.dashboard);
  revalidatePath("/contacts");
  revalidatePath("/dashboard");
}

/**
 * Revalidate caches after account changes
 */
export function revalidateAccountCaches() {
  revalidateTag(CACHE_TAGS.accounts);
  revalidateTag(CACHE_TAGS.dashboard);
  revalidatePath("/accounts");
  revalidatePath("/dashboard");
}

/**
 * Revalidate caches after task changes
 */
export function revalidateTaskCaches() {
  revalidateTag(CACHE_TAGS.tasks);
  revalidateTag(CACHE_TAGS.dashboard);
  revalidatePath("/tasks");
  revalidatePath("/dashboard");
}

/**
 * Revalidate caches after opportunity changes
 */
export function revalidateOpportunityCaches() {
  revalidateTag(CACHE_TAGS.opportunities);
  revalidateTag(CACHE_TAGS.dashboard);
  revalidateTag(CACHE_TAGS.pipeline);
  revalidatePath("/opportunities");
  revalidatePath("/dashboard");
  revalidatePath("/pipeline");
}

/**
 * Revalidate caches after document changes
 */
export function revalidateDocumentCaches() {
  revalidateTag(CACHE_TAGS.documents);
  revalidatePath("/documents");
}

/**
 * Revalidate all caches (use sparingly)
 */
export function revalidateAllCaches() {
  Object.values(CACHE_TAGS).forEach((tag) => revalidateTag(tag));
  revalidatePath("/dashboard");
  revalidatePath("/leads");
  revalidatePath("/contacts");
  revalidatePath("/accounts");
  revalidatePath("/tasks");
  revalidatePath("/opportunities");
  revalidatePath("/documents");
  revalidatePath("/pipeline");
}
