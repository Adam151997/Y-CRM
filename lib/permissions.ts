import prisma from "@/lib/db";
import { Prisma } from "@prisma/client";
import { cache } from "react";

// =============================================================================
// Types
// =============================================================================

export type ActionType = "view" | "create" | "edit" | "delete";
export type RecordVisibility = "ALL" | "OWN_ONLY" | "UNASSIGNED";

export interface ModulePermission {
  actions: ActionType[];
  fields: {
    view: string[] | null;  // null = all fields
    edit: string[] | null;  // null = all fields
  };
  recordVisibility: RecordVisibility;
}

export interface UserPermissions {
  role: {
    id: string;
    name: string;
    isSystem: boolean;
  } | null;
  permissions: Map<string, ModulePermission>;
  isAdmin: boolean;
}

// Built-in modules
export const BUILT_IN_MODULES = [
  // Sales modules
  "leads",
  "contacts",
  "accounts",
  "opportunities",
  "invoices",
  "inventory",
  // CS modules
  "tickets",
  "health_scores",
  "renewals",
  "playbooks",
  // Marketing modules
  "campaigns",
  "segments",
  "forms",
  // HR modules
  "employees",
  "leaves",
  "payroll",
  // Shared modules
  "tasks",
  "documents",
  "reports",
  "settings",
  "ai_assistant",
] as const;

// Modules that require admin-level access by default
export const ADMIN_ONLY_MODULES = ["settings", "ai_assistant"] as const;

// All possible actions
export const ALL_ACTIONS: ActionType[] = ["view", "create", "edit", "delete"];

// Record visibility options
export const RECORD_VISIBILITY_OPTIONS: { value: RecordVisibility; label: string; description: string }[] = [
  { value: "ALL", label: "All Records", description: "Can access all records in this module" },
  { value: "OWN_ONLY", label: "Own Records Only", description: "Can only access records assigned to them" },
  { value: "UNASSIGNED", label: "Own + Unassigned", description: "Can access own records and unassigned records" },
];

// =============================================================================
// Permission Fetching (cached per request)
// =============================================================================

/**
 * Get user's permissions for an organization
 * Cached per request to avoid multiple DB calls
 */
export const getUserPermissions = cache(async (
  clerkUserId: string,
  orgId: string
): Promise<UserPermissions> => {
  const userRole = await prisma.userRole.findUnique({
    where: {
      clerkUserId_orgId: {
        clerkUserId,
        orgId,
      },
    },
    include: {
      role: {
        include: {
          permissions: true,
        },
      },
    },
  });

  if (!userRole?.role) {
    return {
      role: null,
      permissions: new Map(),
      isAdmin: false,
    };
  }

  const { role } = userRole;
  const isAdmin = role.name.toLowerCase() === "admin" || role.isSystem;

  // Build permissions map
  const permissions = new Map<string, ModulePermission>();

  for (const perm of role.permissions) {
    const fieldsConfig = perm.fields as { view?: string[]; edit?: string[] } | null;
    
    permissions.set(perm.module, {
      actions: perm.actions as ActionType[],
      fields: {
        view: fieldsConfig?.view || null,
        edit: fieldsConfig?.edit || null,
      },
      recordVisibility: (perm.recordVisibility as RecordVisibility) || "ALL",
    });
  }

  return {
    role: {
      id: role.id,
      name: role.name,
      isSystem: role.isSystem,
    },
    permissions,
    isAdmin,
  };
});

// =============================================================================
// Permission Checking
// =============================================================================

/**
 * Check if user can perform an action on a module
 */
export async function checkPermission(
  clerkUserId: string,
  orgId: string,
  module: string,
  action: ActionType
): Promise<boolean> {
  const userPermissions = await getUserPermissions(clerkUserId, orgId);

  // Admins have full access
  if (userPermissions.isAdmin) {
    return true;
  }

  // No role assigned
  if (!userPermissions.role) {
    return false;
  }

  // Check module permission
  const modulePerms = userPermissions.permissions.get(module);
  if (!modulePerms) {
    return false;
  }

  return modulePerms.actions.includes(action);
}

/**
 * Get module permission details including fields and record visibility
 */
export async function getModulePermission(
  clerkUserId: string,
  orgId: string,
  module: string
): Promise<ModulePermission | null> {
  const userPermissions = await getUserPermissions(clerkUserId, orgId);

  // Admins have full access
  if (userPermissions.isAdmin) {
    return {
      actions: ALL_ACTIONS,
      fields: { view: null, edit: null },
      recordVisibility: "ALL",
    };
  }

  return userPermissions.permissions.get(module) || null;
}

/**
 * Get allowed fields for a module/action
 * Returns null if all fields are allowed
 */
export async function getAllowedFields(
  clerkUserId: string,
  orgId: string,
  module: string,
  action: "view" | "edit"
): Promise<string[] | null> {
  const modulePerms = await getModulePermission(clerkUserId, orgId, module);

  if (!modulePerms) {
    return []; // No permission = no fields
  }

  return modulePerms.fields[action];
}

/**
 * Get record visibility setting for a module
 */
export async function getRecordVisibility(
  clerkUserId: string,
  orgId: string,
  module: string
): Promise<RecordVisibility> {
  const modulePerms = await getModulePermission(clerkUserId, orgId, module);
  return modulePerms?.recordVisibility || "ALL";
}

/**
 * Check if user can access a specific field
 */
export async function canAccessField(
  clerkUserId: string,
  orgId: string,
  module: string,
  field: string,
  action: "view" | "edit"
): Promise<boolean> {
  const allowedFields = await getAllowedFields(clerkUserId, orgId, module, action);

  // null means all fields allowed
  if (allowedFields === null) {
    return true;
  }

  return allowedFields.includes(field);
}

/**
 * Filter object to only include allowed fields
 */
export function filterToAllowedFields<T extends Record<string, unknown>>(
  data: T,
  allowedFields: string[] | null
): Partial<T> {
  // null means all fields allowed
  if (allowedFields === null) {
    return data;
  }

  const filtered: Partial<T> = {};
  for (const field of allowedFields) {
    if (field in data) {
      filtered[field as keyof T] = data[field as keyof T];
    }
  }

  // Always include id if present
  if ("id" in data) {
    (filtered as Record<string, unknown>)["id"] = (data as Record<string, unknown>)["id"];
  }

  return filtered;
}

/**
 * Filter array of objects to only include allowed fields
 */
export function filterArrayToAllowedFields<T extends Record<string, unknown>>(
  dataArray: T[],
  allowedFields: string[] | null
): Partial<T>[] {
  return dataArray.map((item) => filterToAllowedFields(item, allowedFields));
}

/**
 * Build record visibility filter for Prisma queries
 */
export function buildRecordVisibilityFilter(
  visibility: RecordVisibility,
  clerkUserId: string
): Record<string, unknown> {
  switch (visibility) {
    case "OWN_ONLY":
      return { assignedToId: clerkUserId };
    case "UNASSIGNED":
      return {
        OR: [
          { assignedToId: clerkUserId },
          { assignedToId: null },
        ],
      };
    case "ALL":
    default:
      return {};
  }
}

/**
 * Check if user can access a specific record based on visibility rules
 */
export function canAccessRecord(
  visibility: RecordVisibility,
  clerkUserId: string,
  recordAssignedToId: string | null
): boolean {
  switch (visibility) {
    case "OWN_ONLY":
      return recordAssignedToId === clerkUserId;
    case "UNASSIGNED":
      return recordAssignedToId === clerkUserId || recordAssignedToId === null;
    case "ALL":
    default:
      return true;
  }
}

// =============================================================================
// API Route Helpers
// =============================================================================

/**
 * Throws 403 error if user doesn't have permission
 * Use in API routes
 */
export async function requirePermission(
  clerkUserId: string,
  orgId: string,
  module: string,
  action: ActionType
): Promise<void> {
  const hasPermission = await checkPermission(clerkUserId, orgId, module, action);

  if (!hasPermission) {
    throw new PermissionError(
      `You don't have permission to ${action} ${module}`,
      403
    );
  }
}

/**
 * Get full permission context for API routes
 * Returns permission details needed for filtering
 */
export async function getPermissionContext(
  clerkUserId: string,
  orgId: string,
  module: string,
  action: ActionType
): Promise<{
  allowed: boolean;
  allowedViewFields: string[] | null;
  allowedEditFields: string[] | null;
  recordVisibility: RecordVisibility;
  visibilityFilter: Record<string, unknown>;
}> {
  const modulePerms = await getModulePermission(clerkUserId, orgId, module);

  if (!modulePerms || !modulePerms.actions.includes(action)) {
    return {
      allowed: false,
      allowedViewFields: [],
      allowedEditFields: [],
      recordVisibility: "ALL",
      visibilityFilter: {},
    };
  }

  return {
    allowed: true,
    allowedViewFields: modulePerms.fields.view,
    allowedEditFields: modulePerms.fields.edit,
    recordVisibility: modulePerms.recordVisibility,
    visibilityFilter: buildRecordVisibilityFilter(modulePerms.recordVisibility, clerkUserId),
  };
}

export class PermissionError extends Error {
  status: number;

  constructor(message: string, status: number = 403) {
    super(message);
    this.name = "PermissionError";
    this.status = status;
  }
}

// =============================================================================
// Role Management Helpers
// =============================================================================

/**
 * Create default roles for a new organization
 */
export async function createDefaultRoles(orgId: string): Promise<void> {
  // Modules accessible by non-admin roles (excludes settings)
  const standardModules = BUILT_IN_MODULES.filter(
    (m) => !(ADMIN_ONLY_MODULES as readonly string[]).includes(m)
  );

  const defaultRoles = [
    {
      name: "Admin",
      description: "Full access to all features including settings",
      isSystem: true,
      isDefault: false,
      permissions: BUILT_IN_MODULES.map((module) => ({
        module,
        actions: ALL_ACTIONS as string[],
        fields: Prisma.JsonNull,
        recordVisibility: "ALL",
      })),
    },
    {
      name: "Manager",
      description: "Can manage all records but not system settings",
      isSystem: false,
      isDefault: false,
      permissions: standardModules.map((module) => ({
        module,
        actions: ALL_ACTIONS as string[],
        fields: Prisma.JsonNull,
        recordVisibility: "ALL",
      })),
    },
    {
      name: "Sales Rep",
      description: "Standard access for sales team members",
      isSystem: false,
      isDefault: true,
      permissions: standardModules.map((module) => ({
        module,
        actions: ["view", "create", "edit"] as string[],
        fields: Prisma.JsonNull,
        recordVisibility: "OWN_ONLY",
      })),
    },
    {
      name: "Read Only",
      description: "View-only access to records",
      isSystem: false,
      isDefault: false,
      permissions: standardModules.map((module) => ({
        module,
        actions: ["view"] as string[],
        fields: Prisma.JsonNull,
        recordVisibility: "ALL",
      })),
    },
  ];

  for (const roleData of defaultRoles) {
    const { permissions, ...role } = roleData;

    await prisma.role.create({
      data: {
        ...role,
        orgId,
        permissions: {
          create: permissions,
        },
      },
    });
  }
}

/**
 * Assign default role to a new user
 */
export async function assignDefaultRole(
  clerkUserId: string,
  orgId: string
): Promise<void> {
  // Find default role
  const defaultRole = await prisma.role.findFirst({
    where: {
      orgId,
      isDefault: true,
    },
  });

  if (!defaultRole) {
    // Fall back to first non-admin role
    const fallbackRole = await prisma.role.findFirst({
      where: {
        orgId,
        isSystem: false,
      },
    });

    if (fallbackRole) {
      await prisma.userRole.create({
        data: {
          clerkUserId,
          orgId,
          roleId: fallbackRole.id,
        },
      });
    }
    return;
  }

  await prisma.userRole.create({
    data: {
      clerkUserId,
      orgId,
      roleId: defaultRole.id,
    },
  });
}

/**
 * Get all modules (built-in + custom) for an organization
 */
export async function getAllModules(orgId: string): Promise<{
  builtIn: string[];
  custom: { slug: string; name: string }[];
}> {
  const customModules = await prisma.customModule.findMany({
    where: { orgId, isActive: true },
    select: { slug: true, name: true },
    orderBy: { displayOrder: "asc" },
  });

  return {
    builtIn: [...BUILT_IN_MODULES],
    custom: customModules,
  };
}
