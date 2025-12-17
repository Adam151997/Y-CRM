import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";
import { calculateSegmentMembers, previewSegmentMembers, SegmentRule, RuleLogic, TargetEntity } from "@/lib/marketing/segment-calculator";
import { createAuditLog } from "@/lib/audit";
import prisma from "@/lib/db";

// POST /api/marketing/segments/[id]/calculate - Calculate segment members
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { orgId, userId } = await getAuthContext();
    const { id } = await params;

    // Verify segment exists and belongs to org
    const segment = await prisma.segment.findFirst({
      where: { id, orgId },
    });

    if (!segment) {
      return NextResponse.json(
        { error: "Segment not found" },
        { status: 404 }
      );
    }

    // Calculate members
    const result = await calculateSegmentMembers(id, orgId);

    // Audit log
    await createAuditLog({
      orgId,
      action: "UPDATE",
      module: "SEGMENT",
      recordId: id,
      actorType: "USER",
      actorId: userId,
      metadata: {
        action: "CALCULATE_MEMBERS",
        memberCount: result.memberCount,
        membersAdded: result.membersAdded,
        membersRemoved: result.membersRemoved,
      },
    });

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("Error calculating segment members:", error);
    return NextResponse.json(
      { error: "Failed to calculate segment members" },
      { status: 500 }
    );
  }
}

// GET /api/marketing/segments/[id]/calculate - Preview segment members (without saving)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { orgId } = await getAuthContext();
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "10");

    // Fetch segment
    const segment = await prisma.segment.findFirst({
      where: { id, orgId },
    });

    if (!segment) {
      return NextResponse.json(
        { error: "Segment not found" },
        { status: 404 }
      );
    }

    // Preview members
    const result = await previewSegmentMembers(
      orgId,
      segment.targetEntity as TargetEntity,
      segment.rules as SegmentRule[],
      segment.ruleLogic as RuleLogic,
      limit
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error previewing segment members:", error);
    return NextResponse.json(
      { error: "Failed to preview segment members" },
      { status: 500 }
    );
  }
}
