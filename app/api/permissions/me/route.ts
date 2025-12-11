import { NextResponse } from "next/server";
import { getApiAuthContext } from "@/lib/auth";
import { getUserPermissions } from "@/lib/permissions";

export const dynamic = "force-dynamic";

/**
 * GET /api/permissions/me
 * Get current user's permissions
 */
export async function GET() {
  try {
    const auth = await getApiAuthContext();
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const permissions = await getUserPermissions(auth.userId, auth.orgId);

    // Convert Map to plain object for JSON serialization
    const permissionsObject: Record<string, {
      actions: string[];
      fields: Record<string, string[]> | null;
    }> = {};

    permissions.permissions.forEach((value, key) => {
      permissionsObject[key] = value;
    });

    return NextResponse.json({
      role: permissions.role,
      permissions: permissionsObject,
      isAdmin: permissions.isAdmin,
    });
  } catch (error) {
    console.error("Error fetching permissions:", error);
    return NextResponse.json(
      { error: "Failed to fetch permissions" },
      { status: 500 }
    );
  }
}
