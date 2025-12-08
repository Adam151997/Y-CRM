import { NextRequest, NextResponse } from "next/server";
import { getApiAuthContext } from "@/lib/auth";
import prisma from "@/lib/db";
import { createAuditLog } from "@/lib/audit";
import { Prisma } from "@prisma/client";

interface RouteParams {
  params: Promise<{ slug: string; id: string }>;
}

/**
 * GET /api/modules/[slug]/records/[id]
 * Get a single record
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await getApiAuthContext();
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { slug, id } = await params;

    // Get the module
    const module = await prisma.customModule.findFirst({
      where: {
        orgId: auth.orgId,
        slug,
      },
      include: {
        fields: {
          where: { isActive: true },
          orderBy: { displayOrder: "asc" },
        },
      },
    });

    if (!module) {
      return NextResponse.json({ error: "Module not found" }, { status: 404 });
    }

    // Get the record
    const record = await prisma.customModuleRecord.findFirst({
      where: {
        id,
        orgId: auth.orgId,
        moduleId: module.id,
      },
    });

    if (!record) {
      return NextResponse.json({ error: "Record not found" }, { status: 404 });
    }

    return NextResponse.json({ record, module });
  } catch (error) {
    console.error("[API] Error fetching record:", error);
    return NextResponse.json(
      { error: "Failed to fetch record" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/modules/[slug]/records/[id]
 * Update a record
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await getApiAuthContext();
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { slug, id } = await params;
    const body = await request.json();

    // Get the module
    const module = await prisma.customModule.findFirst({
      where: {
        orgId: auth.orgId,
        slug,
      },
      include: {
        fields: {
          where: { isActive: true },
          orderBy: { displayOrder: "asc" },
        },
      },
    });

    if (!module) {
      return NextResponse.json({ error: "Module not found" }, { status: 404 });
    }

    // Get existing record
    const existing = await prisma.customModuleRecord.findFirst({
      where: {
        id,
        orgId: auth.orgId,
        moduleId: module.id,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Record not found" }, { status: 404 });
    }

    // Extract data and assignedToId
    const { data, assignedToId } = body as {
      data?: Record<string, unknown>;
      assignedToId?: string | null;
    };

    // Merge existing data with new data
    const existingData = (existing.data as Record<string, unknown>) || {};
    const mergedData = data
      ? { ...existingData, ...data }
      : existingData;

    // Update the record
    const record = await prisma.customModuleRecord.update({
      where: { id },
      data: {
        data: mergedData as Prisma.InputJsonValue,
        ...(assignedToId !== undefined ? { assignedToId } : {}),
      },
    });

    // Audit log
    await createAuditLog({
      orgId: auth.orgId,
      action: "UPDATE",
      module: "CUSTOM_MODULE_RECORD",
      recordId: record.id,
      actorType: "USER",
      actorId: auth.userId,
      previousState: existing as unknown as Record<string, unknown>,
      newState: record as unknown as Record<string, unknown>,
      metadata: { moduleSlug: module.slug, moduleName: module.name },
    });

    return NextResponse.json({ record });
  } catch (error) {
    console.error("[API] Error updating record:", error);
    return NextResponse.json(
      { error: "Failed to update record" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/modules/[slug]/records/[id]
 * Delete a record
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await getApiAuthContext();
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { slug, id } = await params;

    // Get the module
    const module = await prisma.customModule.findFirst({
      where: {
        orgId: auth.orgId,
        slug,
      },
    });

    if (!module) {
      return NextResponse.json({ error: "Module not found" }, { status: 404 });
    }

    // Get existing record
    const existing = await prisma.customModuleRecord.findFirst({
      where: {
        id,
        orgId: auth.orgId,
        moduleId: module.id,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Record not found" }, { status: 404 });
    }

    // Delete the record
    await prisma.customModuleRecord.delete({
      where: { id },
    });

    // Audit log
    await createAuditLog({
      orgId: auth.orgId,
      action: "DELETE",
      module: "CUSTOM_MODULE_RECORD",
      recordId: id,
      actorType: "USER",
      actorId: auth.userId,
      previousState: existing as unknown as Record<string, unknown>,
      metadata: { moduleSlug: module.slug, moduleName: module.name },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[API] Error deleting record:", error);
    return NextResponse.json(
      { error: "Failed to delete record" },
      { status: 500 }
    );
  }
}
