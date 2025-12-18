import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";
import prisma from "@/lib/db";
import { createAuditLog } from "@/lib/audit";
import { z } from "zod";

// GET /api/marketing/campaigns/[id] - Get a single campaign
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { orgId } = await getAuthContext();
    const { id } = await params;

    const campaign = await prisma.campaign.findFirst({
      where: { id, orgId },
      include: {
        segment: {
          select: { id: true, name: true, memberCount: true },
        },
      },
    });

    if (!campaign) {
      return NextResponse.json(
        { error: "Campaign not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ campaign });
  } catch (error) {
    console.error("Error fetching campaign:", error);
    return NextResponse.json(
      { error: "Failed to fetch campaign" },
      { status: 500 }
    );
  }
}

// Helper to transform datetime strings
const datetimeTransform = z.string().optional().nullable().transform((val) => {
  if (val === undefined) return undefined;
  if (val === null) return null;
  if (val.trim() === "") return null;
  const date = new Date(val);
  return isNaN(date.getTime()) ? null : date.toISOString();
});

// Update schema
const updateCampaignSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().optional().nullable(),
  type: z.enum(["EMAIL", "SOCIAL", "EVENT", "WEBINAR", "SMS", "ADS"]).optional(),
  status: z.enum(["DRAFT", "SCHEDULED", "ACTIVE", "PAUSED", "COMPLETED", "CANCELLED"]).optional(),
  segmentId: z.string().optional().nullable(),
  subject: z.string().optional().nullable(),
  content: z.any().optional(),
  settings: z.any().optional(),
  scheduledAt: datetimeTransform,
  startedAt: datetimeTransform,
  completedAt: datetimeTransform,
  budget: z.number().positive().optional().nullable(),
  spent: z.number().optional().nullable(),
  metrics: z.any().optional(),
});

// PUT /api/marketing/campaigns/[id] - Update a campaign
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { orgId, userId } = await getAuthContext();
    const { id } = await params;
    const body = await request.json();

    // Validate request body
    const validationResult = updateCampaignSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Invalid request data", details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    // Check if campaign exists
    const existingCampaign = await prisma.campaign.findFirst({
      where: { id, orgId },
    });

    if (!existingCampaign) {
      return NextResponse.json(
        { error: "Campaign not found" },
        { status: 404 }
      );
    }

    // If segmentId provided, verify it exists
    if (data.segmentId) {
      const segment = await prisma.segment.findFirst({
        where: { id: data.segmentId, orgId },
      });
      if (!segment) {
        return NextResponse.json(
          { error: "Segment not found" },
          { status: 404 }
        );
      }
    }

    // Build update data
    const updateData: Record<string, unknown> = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.type !== undefined) updateData.type = data.type;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.segmentId !== undefined) updateData.segmentId = data.segmentId;
    if (data.subject !== undefined) updateData.subject = data.subject;
    if (data.content !== undefined) updateData.content = data.content;
    if (data.settings !== undefined) updateData.settings = data.settings;
    if (data.scheduledAt !== undefined) {
      updateData.scheduledAt = data.scheduledAt ? new Date(data.scheduledAt) : null;
    }
    if (data.startedAt !== undefined) {
      updateData.startedAt = data.startedAt ? new Date(data.startedAt) : null;
    }
    if (data.completedAt !== undefined) {
      updateData.completedAt = data.completedAt ? new Date(data.completedAt) : null;
    }
    if (data.budget !== undefined) updateData.budget = data.budget;
    if (data.spent !== undefined) updateData.spent = data.spent;
    if (data.metrics !== undefined) updateData.metrics = data.metrics;

    // Update campaign
    const campaign = await prisma.campaign.update({
      where: { id },
      data: updateData,
      include: {
        segment: {
          select: { id: true, name: true },
        },
      },
    });

    // Audit log
    await createAuditLog({
      orgId,
      action: "UPDATE",
      module: "CAMPAIGN",
      recordId: campaign.id,
      actorType: "USER",
      actorId: userId,
      previousState: existingCampaign as unknown as Record<string, unknown>,
      newState: campaign as unknown as Record<string, unknown>,
    });

    return NextResponse.json({ campaign });
  } catch (error) {
    console.error("Error updating campaign:", error);
    return NextResponse.json(
      { error: "Failed to update campaign" },
      { status: 500 }
    );
  }
}

// DELETE /api/marketing/campaigns/[id] - Delete a campaign
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { orgId, userId } = await getAuthContext();
    const { id } = await params;

    // Check if campaign exists
    const existingCampaign = await prisma.campaign.findFirst({
      where: { id, orgId },
    });

    if (!existingCampaign) {
      return NextResponse.json(
        { error: "Campaign not found" },
        { status: 404 }
      );
    }

    // Delete campaign
    await prisma.campaign.delete({
      where: { id },
    });

    // Audit log
    await createAuditLog({
      orgId,
      action: "DELETE",
      module: "CAMPAIGN",
      recordId: id,
      actorType: "USER",
      actorId: userId,
      previousState: existingCampaign as unknown as Record<string, unknown>,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting campaign:", error);
    return NextResponse.json(
      { error: "Failed to delete campaign" },
      { status: 500 }
    );
  }
}
