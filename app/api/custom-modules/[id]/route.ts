import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getApiAuthContext } from "@/lib/auth";
import prisma from "@/lib/db";
import { createAuditLog } from "@/lib/audit";
import { cleanupOrphanedRelationships } from "@/lib/relationships";
import { checkRoutePermission } from "@/lib/api-permissions";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// Validation schema for updating a custom module
const updateModuleSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  pluralName: z.string().min(1).max(50).optional(),
  description: z.string().max(500).optional().nullable(),
  icon: z.string().optional(),
  color: z.string().optional().nullable(),
  labelField: z.string().optional(),
  showInSidebar: z.boolean().optional(),
  isActive: z.boolean().optional(),
  displayOrder: z.number().optional(),
});

/**
 * GET /api/custom-modules/[id]
 * Get a single custom module with its fields
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await getApiAuthContext();
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check settings view permission
    const permissionError = await checkRoutePermission(auth.userId, auth.orgId, "settings", "view");
    if (permissionError) return permissionError;

    const { id } = await params;

    const module = await prisma.customModule.findFirst({
      where: {
        id,
        orgId: auth.orgId,
      },
      include: {
        fields: {
          where: { isActive: true },
          orderBy: { displayOrder: "asc" },
        },
        _count: {
          select: { records: true },
        },
      },
    });

    if (!module) {
      return NextResponse.json({ error: "Module not found" }, { status: 404 });
    }

    return NextResponse.json({ module });
  } catch (error) {
    console.error("[API] Error fetching custom module:", error);
    return NextResponse.json(
      { error: "Failed to fetch custom module" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/custom-modules/[id]
 * Update a custom module
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await getApiAuthContext();
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check settings edit permission
    const permissionError = await checkRoutePermission(auth.userId, auth.orgId, "settings", "edit");
    if (permissionError) return permissionError;

    const { id } = await params;
    const body = await request.json();
    const validated = updateModuleSchema.parse(body);

    // Verify module exists and belongs to org
    const existing = await prisma.customModule.findFirst({
      where: {
        id,
        orgId: auth.orgId,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Module not found" }, { status: 404 });
    }

    // Update the module
    const module = await prisma.customModule.update({
      where: { id },
      data: validated,
    });

    // Audit log
    await createAuditLog({
      orgId: auth.orgId,
      action: "UPDATE",
      module: "CUSTOM_MODULE",
      recordId: module.id,
      actorType: "USER",
      actorId: auth.userId,
      previousState: existing as unknown as Record<string, unknown>,
      newState: module as unknown as Record<string, unknown>,
    });

    return NextResponse.json({ module });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 }
      );
    }

    console.error("[API] Error updating custom module:", error);
    return NextResponse.json(
      { error: "Failed to update custom module" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/custom-modules/[id]
 * Delete a custom module (and all its records)
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await getApiAuthContext();
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check settings delete permission
    const permissionError = await checkRoutePermission(auth.userId, auth.orgId, "settings", "delete");
    if (permissionError) return permissionError;

    const { id } = await params;

    // Verify module exists and belongs to org
    const existing = await prisma.customModule.findFirst({
      where: {
        id,
        orgId: auth.orgId,
      },
      include: {
        _count: {
          select: { records: true },
        },
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Module not found" }, { status: 404 });
    }

    // Clean up orphaned relationships in other modules before deleting
    // Use the module slug as the identifier
    const cleanupResult = await cleanupOrphanedRelationships(
      auth.orgId,
      existing.slug,
      "*" // Wildcard - clean up all references to this module
    );

    // Delete the module (cascades to records and fields)
    await prisma.customModule.delete({
      where: { id },
    });

    // Audit log
    await createAuditLog({
      orgId: auth.orgId,
      action: "DELETE",
      module: "CUSTOM_MODULE",
      recordId: id,
      actorType: "USER",
      actorId: auth.userId,
      previousState: existing as unknown as Record<string, unknown>,
      metadata: { 
        recordsDeleted: existing._count.records,
        relationshipsCleanedUp: cleanupResult.cleaned,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[API] Error deleting custom module:", error);
    return NextResponse.json(
      { error: "Failed to delete custom module" },
      { status: 500 }
    );
  }
}
