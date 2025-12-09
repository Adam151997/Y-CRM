import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";
import prisma from "@/lib/db";
import { createAuditLog } from "@/lib/audit";
import { z } from "zod";

// GET /api/marketing/segments/[id] - Get a single segment
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { orgId } = await getAuthContext();
    const { id } = await params;

    const segment = await prisma.segment.findFirst({
      where: { id, orgId },
      include: {
        campaigns: {
          select: { id: true, name: true, status: true },
          orderBy: { createdAt: "desc" },
          take: 10,
        },
        _count: {
          select: { campaigns: true },
        },
      },
    });

    if (!segment) {
      return NextResponse.json(
        { error: "Segment not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ segment });
  } catch (error) {
    console.error("Error fetching segment:", error);
    return NextResponse.json(
      { error: "Failed to fetch segment" },
      { status: 500 }
    );
  }
}

// Rule schema
const ruleSchema = z.object({
  field: z.string(),
  operator: z.enum(["equals", "not_equals", "contains", "not_contains", "starts_with", "ends_with", "greater_than", "less_than", "is_empty", "is_not_empty"]),
  value: z.union([z.string(), z.number(), z.boolean()]).optional(),
});

// Update schema
const updateSegmentSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().optional().nullable(),
  rules: z.array(ruleSchema).optional(),
  ruleLogic: z.enum(["AND", "OR"]).optional(),
  type: z.enum(["DYNAMIC", "STATIC"]).optional(),
  staticMembers: z.array(z.string()).optional().nullable(),
  isActive: z.boolean().optional(),
  memberCount: z.number().optional(),
});

// PUT /api/marketing/segments/[id] - Update a segment
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { orgId, userId } = await getAuthContext();
    const { id } = await params;
    const body = await request.json();

    // Validate request body
    const validationResult = updateSegmentSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Invalid request data", details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    // Check if segment exists
    const existingSegment = await prisma.segment.findFirst({
      where: { id, orgId },
    });

    if (!existingSegment) {
      return NextResponse.json(
        { error: "Segment not found" },
        { status: 404 }
      );
    }

    // Build update data
    const updateData: Record<string, unknown> = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.rules !== undefined) updateData.rules = data.rules;
    if (data.ruleLogic !== undefined) updateData.ruleLogic = data.ruleLogic;
    if (data.type !== undefined) updateData.type = data.type;
    if (data.staticMembers !== undefined) updateData.staticMembers = data.staticMembers;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;
    if (data.memberCount !== undefined) {
      updateData.memberCount = data.memberCount;
      updateData.lastCalculatedAt = new Date();
    }

    // Update segment
    const segment = await prisma.segment.update({
      where: { id },
      data: updateData,
    });

    // Audit log
    await createAuditLog({
      orgId,
      action: "UPDATE",
      module: "SEGMENT",
      recordId: segment.id,
      actorType: "USER",
      actorId: userId,
      previousState: existingSegment as unknown as Record<string, unknown>,
      newState: segment as unknown as Record<string, unknown>,
    });

    return NextResponse.json({ segment });
  } catch (error) {
    console.error("Error updating segment:", error);
    return NextResponse.json(
      { error: "Failed to update segment" },
      { status: 500 }
    );
  }
}

// DELETE /api/marketing/segments/[id] - Delete a segment
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { orgId, userId } = await getAuthContext();
    const { id } = await params;

    // Check if segment exists
    const existingSegment = await prisma.segment.findFirst({
      where: { id, orgId },
      include: {
        _count: {
          select: { campaigns: true },
        },
      },
    });

    if (!existingSegment) {
      return NextResponse.json(
        { error: "Segment not found" },
        { status: 404 }
      );
    }

    // Check if segment is used by any campaigns
    if (existingSegment._count.campaigns > 0) {
      return NextResponse.json(
        { error: "Cannot delete segment that is used by campaigns" },
        { status: 400 }
      );
    }

    // Delete segment
    await prisma.segment.delete({
      where: { id },
    });

    // Audit log
    await createAuditLog({
      orgId,
      action: "DELETE",
      module: "SEGMENT",
      recordId: id,
      actorType: "USER",
      actorId: userId,
      previousState: existingSegment as unknown as Record<string, unknown>,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting segment:", error);
    return NextResponse.json(
      { error: "Failed to delete segment" },
      { status: 500 }
    );
  }
}
