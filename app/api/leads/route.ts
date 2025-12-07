import { NextRequest, NextResponse } from "next/server";
import { getApiAuthContext } from "@/lib/auth";
import prisma from "@/lib/db";
import { createAuditLog } from "@/lib/audit";
import { createLeadSchema, leadFilterSchema } from "@/lib/validation/schemas";
import { validateCustomFields } from "@/lib/validation/custom-fields";

// GET /api/leads - List leads with filtering and pagination
export async function GET(request: NextRequest) {
  try {
    const auth = await getApiAuthContext();
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const params = Object.fromEntries(searchParams.entries());

    // Validate filter params
    const filterResult = leadFilterSchema.safeParse(params);
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
      status,
      source,
      assignedToId,
      pipelineStageId,
      createdAfter,
      createdBefore,
    } = filterResult.data;

    // Build where clause
    const where: Record<string, unknown> = { orgId: auth.orgId };

    if (status) where.status = status;
    if (source) where.source = source;
    if (assignedToId) where.assignedToId = assignedToId;
    if (pipelineStageId) where.pipelineStageId = pipelineStageId;

    if (query) {
      where.OR = [
        { firstName: { contains: query, mode: "insensitive" } },
        { lastName: { contains: query, mode: "insensitive" } },
        { email: { contains: query, mode: "insensitive" } },
        { company: { contains: query, mode: "insensitive" } },
      ];
    }

    if (createdAfter || createdBefore) {
      where.createdAt = {};
      if (createdAfter) (where.createdAt as Record<string, Date>).gte = createdAfter;
      if (createdBefore) (where.createdAt as Record<string, Date>).lte = createdBefore;
    }

    // Execute query
    const [leads, total] = await Promise.all([
      prisma.lead.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          pipelineStage: true,
          _count: {
            select: {
              notes: true,
              tasks: true,
            },
          },
        },
      }),
      prisma.lead.count({ where }),
    ]);

    return NextResponse.json({
      data: leads,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Error fetching leads:", error);
    return NextResponse.json(
      { error: "Failed to fetch leads" },
      { status: 500 }
    );
  }
}

// POST /api/leads - Create a new lead
export async function POST(request: NextRequest) {
  try {
    const auth = await getApiAuthContext();
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    // Validate base schema
    const validationResult = createLeadSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validationResult.error.format() },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    // Validate custom fields if present
    if (data.customFields && Object.keys(data.customFields).length > 0) {
      const customFieldValidation = await validateCustomFields(
        auth.orgId,
        "LEAD",
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

    // Check for duplicate email
    if (data.email) {
      const existing = await prisma.lead.findFirst({
        where: {
          orgId: auth.orgId,
          email: data.email,
        },
      });
      if (existing) {
        return NextResponse.json(
          { error: "A lead with this email already exists" },
          { status: 409 }
        );
      }
    }

    // Get default pipeline stage if not provided
    let pipelineStageId = data.pipelineStageId;
    if (!pipelineStageId) {
      const defaultStage = await prisma.pipelineStage.findFirst({
        where: {
          orgId: auth.orgId,
          module: "LEAD",
        },
        orderBy: { order: "asc" },
      });
      pipelineStageId = defaultStage?.id;
    }

    // Create lead
    const lead = await prisma.lead.create({
      data: {
        orgId: auth.orgId,
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone,
        company: data.company,
        title: data.title,
        source: data.source,
        status: data.status,
        pipelineStageId,
        assignedToId: data.assignedToId || auth.userId,
        customFields: data.customFields || {},
      },
      include: {
        pipelineStage: true,
      },
    });

    // Audit log
    await createAuditLog({
      orgId: auth.orgId,
      action: "CREATE",
      module: "LEAD",
      recordId: lead.id,
      actorType: "USER",
      actorId: auth.userId,
      newState: lead as unknown as Record<string, unknown>,
    });

    return NextResponse.json(lead, { status: 201 });
  } catch (error) {
    console.error("Error creating lead:", error);
    return NextResponse.json(
      { error: "Failed to create lead" },
      { status: 500 }
    );
  }
}
