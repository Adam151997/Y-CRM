import { NextResponse } from "next/server";
import { 
  requirePermission, 
  PermissionError, 
  getPermissionContext,
  filterToAllowedFields,
  filterArrayToAllowedFields,
  canAccessRecord,
  type ActionType,
  type RecordVisibility,
} from "@/lib/permissions";

// Re-export types and functions for convenience
export { 
  filterToAllowedFields, 
  filterArrayToAllowedFields,
  canAccessRecord,
  type RecordVisibility,
};

export interface PermissionContext {
  allowed: boolean;
  allowedViewFields: string[] | null;
  allowedEditFields: string[] | null;
  recordVisibility: RecordVisibility;
  visibilityFilter: Record<string, unknown>;
}

/**
 * Wrap an API handler with permission checking
 * 
 * @example
 * export const GET = withPermission("leads", "view", async (req, auth) => {
 *   // ... handler code
 * });
 */
export function withPermission<T>(
  module: string,
  action: ActionType,
  handler: (
    request: Request,
    auth: { userId: string; orgId: string }
  ) => Promise<NextResponse<T>>
) {
  return async (
    request: Request,
    auth: { userId: string; orgId: string }
  ): Promise<NextResponse<T | { error: string }>> => {
    try {
      await requirePermission(auth.userId, auth.orgId, module, action);
      return await handler(request, auth);
    } catch (error) {
      if (error instanceof PermissionError) {
        return NextResponse.json(
          { error: error.message },
          { status: error.status }
        ) as NextResponse<{ error: string }>;
      }
      throw error;
    }
  };
}

/**
 * Check permission and return 403 if not allowed
 * Use inline in API routes
 * 
 * @example
 * const permissionError = await checkRoutePermission(auth.userId, auth.orgId, "leads", "delete");
 * if (permissionError) return permissionError;
 */
export async function checkRoutePermission(
  userId: string,
  orgId: string,
  module: string,
  action: ActionType
): Promise<NextResponse<{ error: string }> | null> {
  try {
    await requirePermission(userId, orgId, module, action);
    return null;
  } catch (error) {
    if (error instanceof PermissionError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }
    throw error;
  }
}

/**
 * Get full permission context for a module/action
 * Returns filters for record visibility and field access
 * 
 * @example
 * const permCtx = await getRoutePermissionContext(auth.userId, auth.orgId, "leads", "view");
 * if (!permCtx.allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
 * 
 * // Use visibilityFilter in Prisma queries
 * const leads = await prisma.lead.findMany({
 *   where: { orgId, ...permCtx.visibilityFilter }
 * });
 * 
 * // Filter response fields
 * return NextResponse.json(filterArrayToAllowedFields(leads, permCtx.allowedViewFields));
 */
export async function getRoutePermissionContext(
  userId: string,
  orgId: string,
  module: string,
  action: ActionType
): Promise<PermissionContext> {
  return getPermissionContext(userId, orgId, module, action);
}

/**
 * Validate that only allowed fields are being updated
 * Returns list of disallowed fields if any
 */
export function validateEditFields(
  data: Record<string, unknown>,
  allowedFields: string[] | null,
  alwaysAllowed: string[] = ["id"]
): { valid: boolean; disallowedFields: string[] } {
  // null means all fields allowed
  if (allowedFields === null) {
    return { valid: true, disallowedFields: [] };
  }

  const allAllowed = [...allowedFields, ...alwaysAllowed];
  const disallowedFields: string[] = [];

  for (const field of Object.keys(data)) {
    if (!allAllowed.includes(field)) {
      disallowedFields.push(field);
    }
  }

  return {
    valid: disallowedFields.length === 0,
    disallowedFields,
  };
}

/**
 * Check if user can access a specific record
 * Returns 403 response if not allowed
 */
export function checkRecordAccess(
  visibility: RecordVisibility,
  userId: string,
  recordAssignedToId: string | null
): NextResponse<{ error: string }> | null {
  if (!canAccessRecord(visibility, userId, recordAssignedToId)) {
    return NextResponse.json(
      { error: "You don't have permission to access this record" },
      { status: 403 }
    );
  }
  return null;
}
