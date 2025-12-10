import { NextRequest, NextResponse } from "next/server";
import { getApiAuthContext } from "@/lib/auth";
import prisma from "@/lib/db";
import { Prisma } from "@prisma/client";
import { createAuditLog } from "@/lib/audit";
import { createNotification } from "@/lib/notifications";
import { createOpportunitySchema } from "@/lib/validation/schemas";
import { validateCustomFields } from "@/lib/validation/custom-fields";
import { z } from "zod";

// Filter schema
const opportunityFilterSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.string().default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
  query: z.string().optional(),
  stageId: z.string().uuid().optional(),
  accountId: z.string().uuid().optional(),
  closedWon: z.enum(["true", "false"]).optional(),
  minValue: z.coerce.number().optional(),
  maxValue: z.coerce.number().optional(),
});

// GET /api/opportunities - List opportunities with filtering and pagination
export async function GET(request: NextRequest) {
  try {
    const auth = await getApiAuthContext();
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const params = Object.fromEntries(searchParams.entries());

    // Validate filter params
    const filterResult = opportunityFilterSchema.safeParse(params);
    if (!filterResult.success) {
      return NextResponse.json(
        { error: "Invalid parameters", details: filterResult.error.format() },
        { status: 400 }
      );
    }

    const {
      page,
      limit,
      sortBy,
      sortOrder,
      query,
      stageId,
      accountId,
      closedWon,
      minValue,
      maxValue,
    } = filterResult.data;

    // Build where clause
    const where: Record<string, unknown> = { orgId: auth.orgId };

    if (stageId) where.stageId = stageId;
    if (accountId) where.accountId = accountId;
    if (closedWon !== undefined) {
      where.closedWon = closedWon === "true" ? true : closedWon === "false" ? false : null;
    }

    if (minValue || maxValue) {
      where.value = {};
      if (minValue) (where.value as Record<string, number>).gte = minValue;
      if (maxValue) (where.value as Record<string, number>).lte = maxValue;
    }

    if (query) {
      where.OR = [
        { name: { contains: query, mode: "insensitive" } },
        { account: { name: { contains: query, mode: "insensitive" } } },
      ];
    }

    // Execute query
    const [opportunities, total] = await Promise.all([
      prisma.opportunity.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          account: {
            select: {
              id: true,
              name: true,
            },
          },
          stage: true,
          _count: {
            select: {
              notes: true,
              tasks: true,
            },
          },
        },
      }),
      prisma.opportunity.count({ where }),
    ]);

    return NextResponse.json({
      data: opportunities,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Error fetching opportunities:", error);
    return NextResponse.json(
      { error: "Failed to fetch opportunities" },
      { status: 500 }
    );
  }
}

// POST /api/opportunities - Create a new opportunity
export async function POST(request: NextRequest) {
  try {
    const auth = await getApiAuthContext();
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    // Validate base schema
    const validationResult = createOpportunitySchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validationResult.error.format() },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    // Verify account exists and belongs to org
    const account = await prisma.account.findFirst({
      where: { id: data.accountId, orgId: auth.orgId },
    });
    if (!account) {
      return NextResponse.json(
        { error: "Account not found" },
        { status: 404 }
      );
    }

    // Verify stage exists and belongs to org
    const stage = await prisma.pipelineStage.findFirst({
      where: { id: data.stageId, orgId: auth.orgId, module: "OPPORTUNITY" },
    });
    if (!stage) {
      return NextResponse.json(
        { error: "Pipeline stage not found" },
        { status: 404 }
      );
    }

    // Validate custom fields if present
    if (data.customFields && Object.keys(data.customFields).length > 0) {
      const customFieldValidation = await validateCustomFields(
        auth.orgId,
        "OPPORTUNITY",
        data.customFields
      );
      if (!customFieldValidation.success) {
        return NextResponse.json(
          { error: "Custom field validation failed", details: customFieldValidation.errors },
          { status: 400 }
        );
      }
      data.customFields = customFieldValidation.data;
    }

    // Create opportunity
    const opportunity = await prisma.opportunity.create({
      data: {
        orgId: auth.orgId,
        name: data.name,
        value: data.value,
        currency: data.currency,
        probability: stage.probability || data.probability,
        accountId: data.accountId,
        stageId: data.stageId,
        expectedCloseDate: data.expectedCloseDate,
        assignedToId: data.assignedToId || auth.userId,
        customFields: data.customFields 
          ? (data.customFields as Prisma.InputJsonValue) 
          : {},
      },
      include: {
        account: {
          select: { id: true, name: true },
        },
        stage: true,
      },
    });

    // Audit log
    await createAuditLog({
      orgId: auth.orgId,
      action: "CREATE",
      module: "OPPORTUNITY",
      recordId: opportunity.id,
      actorType: "USER",
      actorId: auth.userId,
      newState: opportunity as unknown as Record<string, unknown>,
    });

    // Create notification
    const formattedValue = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: opportunity.currency,
      maximumFractionDigits: 0,
    }).format(Number(opportunity.value));

    await createNotification({
      orgId: auth.orgId,
      userId: auth.userId,
      type: "OPPORTUNITY_CREATED",
      title: `Opportunity created: ${opportunity.name}`,
      message: `Value: ${formattedValue} | Account: ${opportunity.account.name}`,
      entityType: "OPPORTUNITY",
      entityId: opportunity.id,
    });

    return NextResponse.json(opportunity, { status: 201 });
  } catch (error) {
    console.error("Error creating opportunity:", error);
    return NextResponse.json(
      { error: "Failed to create opportunity" },
      { status: 500 }
    );
  }
}
