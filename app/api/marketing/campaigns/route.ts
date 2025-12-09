import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";
import prisma from "@/lib/db";
import { createAuditLog } from "@/lib/audit";
import { z } from "zod";

// GET /api/marketing/campaigns - List all campaigns
export async function GET(request: NextRequest) {
  try {
    const { orgId } = await getAuthContext();
    const { searchParams } = new URL(request.url);
    
    const status = searchParams.get("status");
    const type = searchParams.get("type");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const skip = (page - 1) * limit;

    // Build where clause
    const where: Record<string, unknown> = { orgId };
    if (status && status !== "_all") where.status = status;
    if (type && type !== "_all") where.type = type;

    const [campaigns, total] = await Promise.all([
      prisma.campaign.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: {
          segment: {
            select: { id: true, name: true, memberCount: true },
          },
        },
      }),
      prisma.campaign.count({ where }),
    ]);

    return NextResponse.json({
      campaigns,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching campaigns:", error);
    return NextResponse.json(
      { error: "Failed to fetch campaigns" },
      { status: 500 }
    );
  }
}

// Create schema
const createCampaignSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  description: z.string().optional(),
  type: z.enum(["EMAIL", "SOCIAL", "EVENT", "WEBINAR", "SMS", "ADS"]),
  segmentId: z.string().optional(),
  subject: z.string().optional(),
  content: z.any().optional(),
  settings: z.any().optional(),
  scheduledAt: z.string().datetime().optional(),
  budget: z.number().positive().optional(),
});

// POST /api/marketing/campaigns - Create a new campaign
export async function POST(request: NextRequest) {
  try {
    const { orgId, userId } = await getAuthContext();
    const body = await request.json();

    // Validate request body
    const validationResult = createCampaignSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Invalid request data", details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const data = validationResult.data;

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

    // Create campaign
    const campaign = await prisma.campaign.create({
      data: {
        orgId,
        name: data.name,
        description: data.description,
        type: data.type,
        segmentId: data.segmentId || null,
        subject: data.subject,
        content: data.content,
        settings: data.settings,
        scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : null,
        budget: data.budget,
        createdById: userId,
      },
      include: {
        segment: {
          select: { id: true, name: true },
        },
      },
    });

    // Audit log
    await createAuditLog({
      orgId,
      action: "CREATE",
      module: "CAMPAIGN",
      recordId: campaign.id,
      actorType: "USER",
      actorId: userId,
      newState: campaign as unknown as Record<string, unknown>,
    });

    return NextResponse.json({ campaign }, { status: 201 });
  } catch (error) {
    console.error("Error creating campaign:", error);
    return NextResponse.json(
      { error: "Failed to create campaign" },
      { status: 500 }
    );
  }
}
