import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";
import prisma from "@/lib/db";
import { z } from "zod";
import { createAuditLog } from "@/lib/audit";
import { checkRoutePermission } from "@/lib/api-permissions";

// Schema for playbook steps
const stepSchema = z.object({
  order: z.number(),
  dayOffset: z.number().min(0),
  title: z.string().min(1),
  description: z.string().optional(),
  taskType: z.string(),
  assigneeType: z.string(),
});

// Schema for trigger configuration
const triggerConfigSchema = z.object({
  daysBeforeRenewal: z.number().min(1).max(365).optional(),
  healthScoreThreshold: z.number().min(0).max(100).optional(),
}).optional();

// Schema for creating a playbook
const playbookSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  trigger: z.enum(["MANUAL", "NEW_CUSTOMER", "RENEWAL_APPROACHING", "HEALTH_DROP", "TICKET_ESCALATION"]),
  triggerConfig: triggerConfigSchema,
  steps: z.array(stepSchema).min(1),
  isActive: z.boolean().optional().default(true),
  isTemplate: z.boolean().optional().default(false),
});

// GET /api/cs/playbooks - List all playbooks
export async function GET(request: NextRequest) {
  try {
    const { orgId, userId } = await getAuthContext();
    
    // Check settings permission (playbooks are admin configuration)
    const permissionError = await checkRoutePermission(userId, orgId, "settings", "view");
    if (permissionError) return permissionError;

    const { searchParams } = new URL(request.url);

    const isActive = searchParams.get("isActive");
    const trigger = searchParams.get("trigger");

    // Build where clause
    const where: Record<string, unknown> = { orgId };
    if (isActive !== null) {
      where.isActive = isActive === "true";
    }
    if (trigger) {
      where.trigger = trigger;
    }

    const playbooks = await prisma.playbook.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: {
            runs: true,
          },
        },
      },
    });

    // Get active runs count
    const playbooksWithStats = await Promise.all(
      playbooks.map(async (playbook) => {
        const activeRuns = await prisma.playbookRun.count({
          where: {
            playbookId: playbook.id,
            status: "IN_PROGRESS",
          },
        });
        return {
          ...playbook,
          activeRuns,
          totalRuns: playbook._count.runs,
        };
      })
    );

    return NextResponse.json({ playbooks: playbooksWithStats });
  } catch (error) {
    console.error("Failed to fetch playbooks:", error);
    return NextResponse.json(
      { error: "Failed to fetch playbooks" },
      { status: 500 }
    );
  }
}

// POST /api/cs/playbooks - Create a new playbook
export async function POST(request: NextRequest) {
  try {
    const { orgId, userId } = await getAuthContext();
    
    // Check settings permission (playbooks are admin configuration)
    const permissionError = await checkRoutePermission(userId, orgId, "settings", "create");
    if (permissionError) return permissionError;

    const body = await request.json();

    const data = playbookSchema.parse(body);

    const playbook = await prisma.playbook.create({
      data: {
        orgId,
        name: data.name,
        description: data.description,
        trigger: data.trigger,
        triggerConfig: data.triggerConfig || {},
        steps: data.steps,
        isActive: data.isActive,
        isTemplate: data.isTemplate,
        createdById: userId,
      },
    });

    // Audit log
    await createAuditLog({
      orgId,
      action: "CREATE",
      module: "PLAYBOOK",
      recordId: playbook.id,
      actorType: "USER",
      actorId: userId,
      newState: playbook as unknown as Record<string, unknown>,
    });

    return NextResponse.json({ playbook }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 }
      );
    }
    console.error("Failed to create playbook:", error);
    return NextResponse.json(
      { error: "Failed to create playbook" },
      { status: 500 }
    );
  }
}
