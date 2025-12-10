import { NextRequest, NextResponse } from "next/server";
import { getApiAuthContext } from "@/lib/auth";
import prisma from "@/lib/db";
import { z } from "zod";

// Filter schema for audit logs
const auditLogFilterSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  module: z.string().optional(),
  action: z.string().optional(),
  actorType: z.string().optional(),
  recordId: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

// GET /api/audit-logs - List audit logs with filtering and pagination
export async function GET(request: NextRequest) {
  try {
    const auth = await getApiAuthContext();
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const params = Object.fromEntries(searchParams.entries());

    // Validate filter params
    const filterResult = auditLogFilterSchema.safeParse(params);
    if (!filterResult.success) {
      return NextResponse.json(
        { error: "Invalid parameters", details: filterResult.error.format() },
        { status: 400 }
      );
    }

    const { page, limit, module, action, actorType, recordId, startDate, endDate } =
      filterResult.data;

    // Build where clause
    const where: Record<string, unknown> = { orgId: auth.orgId };

    if (module && module !== "_all") where.module = module;
    if (action && action !== "_all") where.action = action;
    if (actorType && actorType !== "_all") where.actorType = actorType;
    if (recordId) where.recordId = recordId;

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) (where.createdAt as Record<string, Date>).gte = new Date(startDate);
      if (endDate) (where.createdAt as Record<string, Date>).lte = new Date(endDate);
    }

    // Execute query
    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.auditLog.count({ where }),
    ]);

    // Get distinct values for filters
    const [modules, actions, actorTypes] = await Promise.all([
      prisma.auditLog.groupBy({
        by: ["module"],
        where: { orgId: auth.orgId },
      }),
      prisma.auditLog.groupBy({
        by: ["action"],
        where: { orgId: auth.orgId },
      }),
      prisma.auditLog.groupBy({
        by: ["actorType"],
        where: { orgId: auth.orgId },
      }),
    ]);

    return NextResponse.json({
      data: logs,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      filters: {
        modules: modules.map((m) => m.module),
        actions: actions.map((a) => a.action),
        actorTypes: actorTypes.map((a) => a.actorType),
      },
    });
  } catch (error) {
    console.error("Error fetching audit logs:", error);
    return NextResponse.json(
      { error: "Failed to fetch audit logs" },
      { status: 500 }
    );
  }
}
