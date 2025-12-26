import { WorkspaceType } from "./workspace-context";

/**
 * Maps each workspace to its associated permission modules.
 * Used to determine workspace visibility based on user's module permissions.
 * If a user has access to ANY module in a workspace, they can see that workspace.
 */
export const WORKSPACE_MODULES: Record<WorkspaceType, string[]> = {
  sales: [
    "leads",
    "contacts",
    "accounts",
    "opportunities",
    "invoices",
    "inventory",
    "tasks",
  ],
  cs: [
    "tickets",
    "health_scores",
    "renewals",
    "playbooks",
    "tasks",
  ],
  marketing: [
    "campaigns",
    "segments",
    "forms",
  ],
  hr: [
    "employees",
    "leaves",
    "payroll",
    "tasks",
  ],
};

/**
 * Get modules associated with a workspace
 */
export function getWorkspaceModules(workspace: WorkspaceType): string[] {
  return WORKSPACE_MODULES[workspace] || [];
}

/**
 * Find which workspace a module belongs to (primary workspace)
 */
export function getModuleWorkspace(module: string): WorkspaceType | null {
  for (const [workspace, modules] of Object.entries(WORKSPACE_MODULES)) {
    if (modules.includes(module)) {
      return workspace as WorkspaceType;
    }
  }
  return null;
}
