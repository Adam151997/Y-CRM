import { NextResponse } from "next/server";
import { requirePermission, PermissionError, type ActionType } from "@/lib/permissions";

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
