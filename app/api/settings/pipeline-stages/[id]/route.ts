import { NextRequest, NextResponse } from "next/server";
import { getApiAuthContext } from "@/lib/auth";
import prisma from "@/lib/db";
import { updatePipelineStageSchema } from "@/lib/validation/schemas";
import { checkRoutePermission } from "@/lib/api-permissions";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/settings/pipeline-stages/[id]
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

    const stage = await prisma.pipelineStage.findFirst({
      where: { id, orgId: auth.orgId },
      include: {
        _count: { select: { leads: true, opportunities: true } },
      },
    });

    if (!stage) {
      return NextResponse.json({ error: "Stage not found" }, { status: 404 });
    }

    return NextResponse.json(stage);
  } catch (error) {
    console.error("Error fetching pipeline stage:", error);
    return NextResponse.json(
      { error: "Failed to fetch pipeline stage" },
      { status: 500 }
    );
  }
}

// PUT /api/settings/pipeline-stages/[id]
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

    // Validate
    const validationResult = updatePipelineStageSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validationResult.error.format() },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    // Check exists
    const existing = await prisma.pipelineStage.findFirst({
      where: { id, orgId: auth.orgId },
    });

    if (!existing) {
      return NextResponse.json({ error: "Stage not found" }, { status: 404 });
    }

    // Update
    const updated = await prisma.pipelineStage.update({
      where: { id },
      data,
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating pipeline stage:", error);
    return NextResponse.json(
      { error: "Failed to update pipeline stage" },
      { status: 500 }
    );
  }
}

// DELETE /api/settings/pipeline-stages/[id]
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

    // Check exists and get counts
    const existing = await prisma.pipelineStage.findFirst({
      where: { id, orgId: auth.orgId },
      include: {
        _count: { select: { leads: true, opportunities: true } },
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Stage not found" }, { status: 404 });
    }

    // Check if stage has records
    if (existing._count.leads > 0 || existing._count.opportunities > 0) {
      return NextResponse.json(
        { error: "Cannot delete a stage that has records. Move or delete the records first." },
        { status: 400 }
      );
    }

    // Delete
    await prisma.pipelineStage.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting pipeline stage:", error);
    return NextResponse.json(
      { error: "Failed to delete pipeline stage" },
      { status: 500 }
    );
  }
}
