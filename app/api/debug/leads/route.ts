/**
 * Diagnostic API for debugging AI tool execution
 * GET /api/debug/leads - Check leads in database
 * POST /api/debug/leads - Test direct lead creation
 */

import { NextRequest, NextResponse } from "next/server";
import { getApiAuthContext } from "@/lib/auth";
import prisma from "@/lib/db";

export const runtime = "nodejs";

/**
 * GET /api/debug/leads - Check all leads in database
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await getApiAuthContext();
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const showAll = searchParams.get("all") === "true";

    // Get leads - optionally filter by org
    const leads = await prisma.lead.findMany({
      where: showAll ? {} : { orgId: auth.orgId },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        orgId: true,
        firstName: true,
        lastName: true,
        email: true,
        company: true,
        status: true,
        createdAt: true,
      },
    });

    // Get unique orgIds in database
    const orgIds = await prisma.lead.groupBy({
      by: ["orgId"],
      _count: { id: true },
    });

    return NextResponse.json({
      currentAuth: {
        userId: auth.userId,
        orgId: auth.orgId,
        orgSlug: auth.orgSlug,
      },
      leadsInCurrentOrg: leads.filter(l => l.orgId === auth.orgId).length,
      leadsInOtherOrgs: leads.filter(l => l.orgId !== auth.orgId).length,
      totalLeadsReturned: leads.length,
      orgIdDistribution: orgIds,
      leads: leads.map(l => ({
        ...l,
        isCurrentOrg: l.orgId === auth.orgId,
        orgIdPreview: l.orgId.substring(0, 20) + "...",
      })),
    });
  } catch (error) {
    console.error("[Debug API] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/debug/leads - Test direct lead creation with detailed logging
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await getApiAuthContext();
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { firstName = "Debug", lastName = "Test" } = body;

    console.log("[Debug API] Auth context:", {
      userId: auth.userId,
      orgId: auth.orgId,
      orgSlug: auth.orgSlug,
    });

    // Create lead directly
    const lead = await prisma.lead.create({
      data: {
        orgId: auth.orgId,
        firstName,
        lastName,
        email: `debug-${Date.now()}@test.com`,
        company: "Debug Test Company",
        status: "NEW",
      },
    });

    console.log("[Debug API] Created lead:", {
      id: lead.id,
      orgId: lead.orgId,
      firstName: lead.firstName,
    });

    // Verify it exists
    const verification = await prisma.lead.findUnique({
      where: { id: lead.id },
    });

    // Count leads in this org
    const orgLeadCount = await prisma.lead.count({
      where: { orgId: auth.orgId },
    });

    return NextResponse.json({
      success: true,
      createdLead: {
        id: lead.id,
        orgId: lead.orgId,
        firstName: lead.firstName,
        lastName: lead.lastName,
      },
      verification: {
        found: !!verification,
        matchesOrg: verification?.orgId === auth.orgId,
      },
      orgLeadCount,
      authContext: {
        userId: auth.userId,
        orgId: auth.orgId,
      },
    });
  } catch (error) {
    console.error("[Debug API] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
