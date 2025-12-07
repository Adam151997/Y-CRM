import { revalidateTag, revalidatePath } from "next/cache";

/**
 * Revalidate cache tags when data changes
 */
export function revalidateDashboard() {
  revalidateTag("dashboard");
}

export function revalidateLeads() {
  revalidateTag("leads");
  revalidateTag("dashboard");
  revalidateTag("pipeline");
}

export function revalidateContacts() {
  revalidateTag("contacts");
  revalidateTag("dashboard");
}

export function revalidateAccounts() {
  revalidateTag("accounts");
  revalidateTag("dashboard");
}

export function revalidateTasks() {
  revalidateTag("tasks");
  revalidateTag("dashboard");
}

export function revalidateOpportunities() {
  revalidateTag("opportunities");
  revalidateTag("dashboard");
  revalidateTag("pipeline");
}

export function revalidatePipeline() {
  revalidateTag("pipeline");
}

export function revalidateDocuments() {
  revalidateTag("documents");
}

/**
 * Revalidate everything - use sparingly
 */
export function revalidateAll() {
  revalidateTag("dashboard");
  revalidateTag("leads");
  revalidateTag("contacts");
  revalidateTag("accounts");
  revalidateTag("tasks");
  revalidateTag("opportunities");
  revalidateTag("pipeline");
  revalidateTag("documents");
}

/**
 * Revalidate specific paths
 */
export function revalidateLeadPage(leadId: string) {
  revalidatePath(`/leads/${leadId}`);
  revalidateLeads();
}

export function revalidateContactPage(contactId: string) {
  revalidatePath(`/contacts/${contactId}`);
  revalidateContacts();
}

export function revalidateAccountPage(accountId: string) {
  revalidatePath(`/accounts/${accountId}`);
  revalidateAccounts();
}

export function revalidateTaskPage(taskId: string) {
  revalidatePath(`/tasks/${taskId}`);
  revalidateTasks();
}
