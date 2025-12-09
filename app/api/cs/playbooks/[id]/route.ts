import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";
import prisma from "@/lib/db";
import { z } from "zod";
import { createAuditLog } from "@/lib/audit";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// Schema for updating a playbook
const updateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().optional(),
  trigger: z.enum(["MANUAL", "NEW_CUSTOMER", "RENEWAL_APPROACHING", "HEALTH_DROP", "TICKET_ESCALATION"]).optional(),
  steps: z.array(z.object({
    order: z.number(),
    dayOffset: z.number().min(0),
    title: z.string().min(1),
    description: z.string().optional(),
    taskType: z.string(),
    assigneeType: z.string(),
  })).optional(),
  isActive: z.boolean().optional(),
});

// GET /api/cs/playbooks/[id] - Get a single playbook
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { orgId } = await getAuthContext();
    const { id } = await params;

    const playbook = await prisma.playbook.findFirst({
      where: { id, orgId },
      include: {
        runs: {
          orderBy: { startedAt: "desc" },
          take: 10,
        },
      },
    });

    if (!playbook) {
      return NextResponse.json(
        { error: "Playbook not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ playbook });
  } catch (error) {
    console.error("Failed to fetch playbook:", error);
    return NextResponse.json(
      { error: "Failed to fetch playbook" },
      { status: 500 }
    );
  }
}

// PUT /api/cs/playbooks/[id] - Update a playbook
export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const { orgId, userId } = await getAuthContext();
    const { id } = await params;
    const body = await request.json();

    const data = updateSchema.parse(body);

    // Check playbook exists
    const existing = await prisma.playbook.findFirst({
      where: { id, orgId },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Playbook not found" },
        { status: 404 }
      );
    }

    const playbook = await prisma.playbook.update({
      where: { id },
      data,
    });

    // Audit log
    await createAuditLog({
      orgId,
      action: "UPDATE",
      module: "PLAYBOOK",
      recordId: playbook.id,
      actorType: "USER",
      actorId: userId,
      previousState: existing as unknown as Record<string, unknown>,
      newState: playbook as unknown as Record<string, unknown>,
    });

    return NextResponse.json({ playbook });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 }
      );
    }
    console.error("Failed to update playbook:", error);
    return NextResponse.json(
      { error: "Failed to update playbook" },
      { status: 500 }
    );
  }
}

// DELETE /api/cs/playbooks/[id] - Delete a playbook
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const { orgId, userId } = await getAuthContext();
    const { id } = await params;

    const playbook = await prisma.playbook.findFirst({
      where: { id, orgId },
    });

    if (!playbook) {
      return NextResponse.json(
        { error: "Playbook not found" },
        { status: 404 }
      );
    }

    await prisma.playbook.delete({
      where: { id },
    });

    // Audit log
    await createAuditLog({
      orgId,
      action: "DELETE",
      module: "PLAYBOOK",
      recordId: id,
      actorType: "USER",
      actorId: userId,
      previousState: playbook as unknown as Record<string, unknown>,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete playbook:", error);
    return NextResponse.json(
      { error: "Failed to delete playbook" },
      { status: 500 }
    );
  }
}
