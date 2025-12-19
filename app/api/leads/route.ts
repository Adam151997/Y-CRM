import { NextRequest, NextResponse } from "next/server";
import { getApiAuthContext } from "@/lib/auth";
import prisma from "@/lib/db";
import { Prisma } from "@prisma/client";
import { createAuditLog } from "@/lib/audit";
import { createNotification } from "@/lib/notifications";
import { createActivity } from "@/lib/activity";
import { createLeadSchema, leadFilterSchema } from "@/lib/validation/schemas";
import { validateCustomFields } from "@/lib/validation/custom-fields";
import { 
  getRoutePermissionContext, 
  filterArrayToAllowedFields,
  validateEditFields,
} from "@/lib/api-permissions";

// GET /api/leads - List leads with filtering and pagination
export async function GET(request: NextRequest) {
  try {
    const auth = await getApiAuthContext();
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get permission context (includes record visibility filter)
    const permCtx = await getRoutePermissionContext(auth.userId, auth.orgId, "leads", "view");
    if (!permCtx.allowed) {
      return NextResponse.json({ error: "You don't have permission to view leads" }, { status: 403 });
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

    // Build where clause with record visibility filter
    const where: Record<string, unknown> = { 
      orgId: auth.orgId,
      ...permCtx.visibilityFilter, // Apply record-level permissions
    };

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

    // Apply field-level filtering if configured
    const filteredLeads = filterArrayToAllowedFields(
      leads as unknown as Record<string, unknown>[],
      permCtx.allowedViewFields
    );

    return NextResponse.json({
      data: filteredLeads,
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

    // Get permission context
    const permCtx = await getRoutePermissionContext(auth.userId, auth.orgId, "leads", "create");
    if (!permCtx.allowed) {
      return NextResponse.json({ error: "You don't have permission to create leads" }, { status: 403 });
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

    // Validate field-level edit permissions (for create, we check edit fields)
    const fieldValidation = validateEditFields(
      data as Record<string, unknown>,
      permCtx.allowedEditFields,
      ["customFields"] // Always allow customFields wrapper
    );
    if (!fieldValidation.valid) {
      return NextResponse.json(
        { error: `You don't have permission to set these fields: ${fieldValidation.disallowedFields.join(", ")}` },
        { status: 403 }
      );
    }

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
        customFields: data.customFields 
          ? (data.customFields as Prisma.InputJsonValue) 
          : {},
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

    // Create notification
    await createNotification({
      orgId: auth.orgId,
      userId: auth.userId,
      type: "LEAD_CREATED",
      title: `Lead created: ${lead.firstName} ${lead.lastName}`,
      message: lead.company ? `Company: ${lead.company}` : undefined,
      entityType: "LEAD",
      entityId: lead.id,
    });

    // Create activity for timeline
    await createActivity({
      orgId: auth.orgId,
      type: "LEAD_CREATED",
      subject: `Lead created: ${lead.firstName} ${lead.lastName}`,
      description: lead.company ? `Company: ${lead.company}` : null,
      leadId: lead.id,
      performedById: auth.userId,
      performedByType: "USER",
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
