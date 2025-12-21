import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";
import prisma from "@/lib/db";
import { createAuditLog } from "@/lib/audit";
import { z } from "zod";
import { getRoutePermissionContext, checkRoutePermission } from "@/lib/api-permissions";

// GET /api/marketing/segments - List all segments
export async function GET(request: NextRequest) {
  try {
    const { orgId, userId } = await getAuthContext();
    
    // Check campaigns permission (segments are part of marketing/campaigns)
    const permCtx = await getRoutePermissionContext(userId, orgId, "campaigns", "view");
    if (!permCtx.allowed) {
      return NextResponse.json({ error: "You don't have permission to view segments" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    
    const isActive = searchParams.get("isActive");
    const type = searchParams.get("type");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const skip = (page - 1) * limit;

    // Build where clause
    const where: Record<string, unknown> = { orgId };
    if (isActive === "true") where.isActive = true;
    if (isActive === "false") where.isActive = false;
    if (type && type !== "_all") where.type = type;

    const [segments, total] = await Promise.all([
      prisma.segment.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: {
          _count: {
            select: { campaigns: true },
          },
        },
      }),
      prisma.segment.count({ where }),
    ]);

    return NextResponse.json({
      segments,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching segments:", error);
    return NextResponse.json(
      { error: "Failed to fetch segments" },
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

// Create schema
const createSegmentSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  description: z.string().optional(),
  targetEntity: z.enum(["CONTACT", "LEAD"]).default("CONTACT"),
  rules: z.array(ruleSchema).default([]),
  ruleLogic: z.enum(["AND", "OR"]).default("AND"),
  type: z.enum(["DYNAMIC", "STATIC"]).default("DYNAMIC"),
  staticMembers: z.array(z.string()).optional(),
});

// POST /api/marketing/segments - Create a new segment
export async function POST(request: NextRequest) {
  try {
    const { orgId, userId } = await getAuthContext();
    
    // Check campaigns permission (segments are part of marketing/campaigns)
    const permissionError = await checkRoutePermission(userId, orgId, "campaigns", "create");
    if (permissionError) return permissionError;

    const body = await request.json();

    // Validate request body
    const validationResult = createSegmentSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Invalid request data", details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    // Create segment
    const segment = await prisma.segment.create({
      data: {
        orgId,
        name: data.name,
        description: data.description,
        targetEntity: data.targetEntity,
        rules: data.rules,
        ruleLogic: data.ruleLogic,
        type: data.type,
        staticMembers: data.staticMembers,
        createdById: userId,
      },
    });

    // Audit log
    await createAuditLog({
      orgId,
      action: "CREATE",
      module: "SEGMENT",
      recordId: segment.id,
      actorType: "USER",
      actorId: userId,
      newState: segment as unknown as Record<string, unknown>,
    });

    return NextResponse.json({ segment }, { status: 201 });
  } catch (error) {
    console.error("Error creating segment:", error);
    return NextResponse.json(
      { error: "Failed to create segment" },
      { status: 500 }
    );
  }
}
