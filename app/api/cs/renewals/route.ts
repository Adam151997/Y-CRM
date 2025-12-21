import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";
import prisma from "@/lib/db";
import { z } from "zod";
import { createAuditLog } from "@/lib/audit";
import { getRoutePermissionContext, checkRoutePermission } from "@/lib/api-permissions";

// Schema for creating a renewal
const renewalSchema = z.object({
  accountId: z.string().uuid(),
  contractName: z.string().optional(),
  contractValue: z.number().positive(),
  currency: z.string().default("USD"),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  status: z.enum(["UPCOMING", "IN_PROGRESS", "RENEWED", "CHURNED", "DOWNGRADED", "EXPANDED"]).optional().default("UPCOMING"),
  probability: z.number().min(0).max(100).optional().default(50),
  ownerUserId: z.string().optional(),
  notes: z.string().optional(),
  nextAction: z.string().optional(),
  nextActionDate: z.string().datetime().optional(),
});

// GET /api/cs/renewals - List all renewals
export async function GET(request: NextRequest) {
  try {
    const { orgId, userId } = await getAuthContext();
    
    // Check accounts permission (renewals are account-level data)
    const permCtx = await getRoutePermissionContext(userId, orgId, "accounts", "view");
    if (!permCtx.allowed) {
      return NextResponse.json({ error: "You don't have permission to view renewals" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);

    const status = searchParams.get("status");
    const accountId = searchParams.get("accountId");
    const upcoming = searchParams.get("upcoming"); // Days until expiration
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    // Build where clause
    const where: Record<string, unknown> = { orgId };
    
    if (status) {
      where.status = status;
    }
    
    if (accountId) {
      where.accountId = accountId;
    }

    // Filter by upcoming renewals (e.g., next 90 days)
    if (upcoming) {
      const daysAhead = parseInt(upcoming);
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + daysAhead);
      where.endDate = {
        gte: new Date(),
        lte: futureDate,
      };
      where.status = { in: ["UPCOMING", "IN_PROGRESS"] };
    }

    const [renewals, total] = await Promise.all([
      prisma.renewal.findMany({
        where,
        orderBy: { endDate: "asc" },
        skip: offset,
        take: limit,
        include: {
          account: {
            select: {
              id: true,
              name: true,
              industry: true,
            },
          },
        },
      }),
      prisma.renewal.count({ where }),
    ]);

    // Calculate summary stats
    const stats = await prisma.renewal.groupBy({
      by: ["status"],
      where: { orgId },
      _count: true,
      _sum: {
        contractValue: true,
      },
    });

    return NextResponse.json({
      renewals,
      total,
      limit,
      offset,
      stats,
    });
  } catch (error) {
    console.error("Failed to fetch renewals:", error);
    return NextResponse.json(
      { error: "Failed to fetch renewals" },
      { status: 500 }
    );
  }
}

// POST /api/cs/renewals - Create a new renewal
export async function POST(request: NextRequest) {
  try {
    const { orgId, userId } = await getAuthContext();
    
    // Check accounts permission (renewals are account-level data)
    const permissionError = await checkRoutePermission(userId, orgId, "accounts", "create");
    if (permissionError) return permissionError;

    const body = await request.json();

    const data = renewalSchema.parse(body);

    // Verify account belongs to org
    const account = await prisma.account.findFirst({
      where: { id: data.accountId, orgId },
    });

    if (!account) {
      return NextResponse.json(
        { error: "Account not found" },
        { status: 404 }
      );
    }

    const renewal = await prisma.renewal.create({
      data: {
        orgId,
        accountId: data.accountId,
        contractName: data.contractName,
        contractValue: data.contractValue,
        currency: data.currency,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        status: data.status,
        probability: data.probability,
        ownerUserId: data.ownerUserId || userId,
        notes: data.notes,
        nextAction: data.nextAction,
        nextActionDate: data.nextActionDate ? new Date(data.nextActionDate) : null,
      },
      include: {
        account: {
          select: { id: true, name: true },
        },
      },
    });

    // Create activity
    await prisma.activity.create({
      data: {
        orgId,
        type: "RENEWAL_UPDATED",
        subject: `Renewal created: ${account.name}`,
        description: `Contract value: $${data.contractValue.toLocaleString()}`,
        workspace: "cs",
        accountId: data.accountId,
        performedById: userId,
        performedByType: "USER",
      },
    });

    // Audit log
    await createAuditLog({
      orgId,
      action: "CREATE",
      module: "RENEWAL",
      recordId: renewal.id,
      actorType: "USER",
      actorId: userId,
      newState: renewal as unknown as Record<string, unknown>,
    });

    return NextResponse.json({ renewal }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 }
      );
    }
    console.error("Failed to create renewal:", error);
    return NextResponse.json(
      { error: "Failed to create renewal" },
      { status: 500 }
    );
  }
}
