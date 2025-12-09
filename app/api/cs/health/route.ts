import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";
import prisma from "@/lib/db";
import { z } from "zod";
import { createAuditLog } from "@/lib/audit";

// Schema for creating/updating health score
const healthSchema = z.object({
  accountId: z.string().uuid(),
  score: z.number().min(0).max(100).optional(),
  engagementScore: z.number().min(0).max(100).optional(),
  supportScore: z.number().min(0).max(100).optional(),
  relationshipScore: z.number().min(0).max(100).optional(),
  financialScore: z.number().min(0).max(100).optional(),
  adoptionScore: z.number().min(0).max(100).optional(),
  lastLoginAt: z.string().datetime().optional().nullable(),
  lastContactAt: z.string().datetime().optional().nullable(),
  lastMeetingAt: z.string().datetime().optional().nullable(),
});

// Calculate overall score from components
function calculateOverallScore(components: {
  engagementScore: number;
  supportScore: number;
  relationshipScore: number;
  financialScore: number;
  adoptionScore: number;
}): number {
  // Weighted average
  const weights = {
    engagementScore: 0.25,
    supportScore: 0.20,
    relationshipScore: 0.20,
    financialScore: 0.20,
    adoptionScore: 0.15,
  };

  return Math.round(
    components.engagementScore * weights.engagementScore +
    components.supportScore * weights.supportScore +
    components.relationshipScore * weights.relationshipScore +
    components.financialScore * weights.financialScore +
    components.adoptionScore * weights.adoptionScore
  );
}

// Determine risk level from score
function getRiskLevel(score: number): string {
  if (score >= 70) return "LOW";
  if (score >= 50) return "MEDIUM";
  if (score >= 30) return "HIGH";
  return "CRITICAL";
}

// Generate risk reasons
function getRiskReasons(health: {
  score: number;
  openTicketCount: number;
  lastLoginAt: Date | null;
  lastContactAt: Date | null;
}): string[] {
  const reasons: string[] = [];
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

  if (health.openTicketCount >= 3) {
    reasons.push(`${health.openTicketCount} open support tickets`);
  }

  if (!health.lastLoginAt || health.lastLoginAt < sixtyDaysAgo) {
    reasons.push("No login in 60+ days");
  } else if (health.lastLoginAt < thirtyDaysAgo) {
    reasons.push("No login in 30+ days");
  }

  if (!health.lastContactAt || health.lastContactAt < thirtyDaysAgo) {
    reasons.push("No contact in 30+ days");
  }

  if (health.score < 30) {
    reasons.push("Overall health score critically low");
  }

  return reasons;
}

// GET /api/cs/health - List all health scores
export async function GET(request: Request) {
  try {
    const { orgId } = await getAuthContext();
    const { searchParams } = new URL(request.url);

    const riskLevel = searchParams.get("riskLevel");
    const isAtRisk = searchParams.get("isAtRisk");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    // Build where clause
    const where: Record<string, unknown> = { orgId };
    if (riskLevel) {
      where.riskLevel = riskLevel;
    }
    if (isAtRisk === "true") {
      where.isAtRisk = true;
    }

    const [healthScores, total] = await Promise.all([
      prisma.accountHealth.findMany({
        where,
        orderBy: { score: "asc" },
        skip: offset,
        take: limit,
        include: {
          account: {
            select: {
              id: true,
              name: true,
              industry: true,
              type: true,
            },
          },
        },
      }),
      prisma.accountHealth.count({ where }),
    ]);

    return NextResponse.json({
      healthScores,
      total,
      limit,
      offset,
    });
  } catch (error) {
    console.error("Failed to fetch health scores:", error);
    return NextResponse.json(
      { error: "Failed to fetch health scores" },
      { status: 500 }
    );
  }
}

// POST /api/cs/health - Create or update health score
export async function POST(request: Request) {
  try {
    const { orgId, userId } = await getAuthContext();
    const body = await request.json();

    const data = healthSchema.parse(body);

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

    // Get open ticket count
    const openTicketCount = await prisma.ticket.count({
      where: {
        accountId: data.accountId,
        status: { in: ["NEW", "OPEN", "PENDING"] },
      },
    });

    // Prepare health data
    const healthData = {
      engagementScore: data.engagementScore ?? 50,
      supportScore: data.supportScore ?? 50,
      relationshipScore: data.relationshipScore ?? 50,
      financialScore: data.financialScore ?? 50,
      adoptionScore: data.adoptionScore ?? 50,
      lastLoginAt: data.lastLoginAt ? new Date(data.lastLoginAt) : null,
      lastContactAt: data.lastContactAt ? new Date(data.lastContactAt) : null,
      lastMeetingAt: data.lastMeetingAt ? new Date(data.lastMeetingAt) : null,
      openTicketCount,
    };

    // Calculate overall score
    const score = data.score ?? calculateOverallScore(healthData);
    const riskLevel = getRiskLevel(score);
    const isAtRisk = riskLevel === "HIGH" || riskLevel === "CRITICAL";
    const riskReasons = isAtRisk ? getRiskReasons({ ...healthData, score }) : [];

    // Upsert health record
    const health = await prisma.accountHealth.upsert({
      where: { accountId: data.accountId },
      create: {
        orgId,
        accountId: data.accountId,
        score,
        riskLevel,
        isAtRisk,
        riskReasons,
        ...healthData,
        calculatedAt: new Date(),
      },
      update: {
        previousScore: { set: undefined }, // Will be set from current score
        score,
        riskLevel,
        isAtRisk,
        riskReasons,
        ...healthData,
        calculatedAt: new Date(),
      },
    });

    // Update previousScore separately to capture the old value
    if (health.previousScore === null) {
      await prisma.accountHealth.update({
        where: { id: health.id },
        data: { previousScore: score },
      });
    }

    // Audit log
    await createAuditLog({
      orgId,
      action: "UPDATE",
      module: "ACCOUNT_HEALTH",
      recordId: health.id,
      actorType: "USER",
      actorId: userId,
      newState: health as unknown as Record<string, unknown>,
    });

    // If at risk, create activity
    if (isAtRisk) {
      await prisma.activity.create({
        data: {
          orgId,
          type: "HEALTH_ALERT",
          subject: `Health score alert: ${account.name}`,
          description: `Account health dropped to ${score}/100 (${riskLevel} risk)`,
          workspace: "cs",
          accountId: account.id,
          performedById: "SYSTEM",
          performedByType: "SYSTEM",
        },
      });
    }

    return NextResponse.json({ health }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 }
      );
    }
    console.error("Failed to update health score:", error);
    return NextResponse.json(
      { error: "Failed to update health score" },
      { status: 500 }
    );
  }
}
