import { NextRequest, NextResponse } from "next/server";
import { getApiAuthContext } from "@/lib/auth";
import prisma from "@/lib/db";
import { createAuditLog } from "@/lib/audit";
import { updateLeadSchema } from "@/lib/validation/schemas";
import { validateCustomFields } from "@/lib/validation/custom-fields";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/leads/[id] - Get a single lead
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await getApiAuthContext();
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const lead = await prisma.lead.findFirst({
      where: {
        id,
        orgId: auth.orgId,
      },
      include: {
        pipelineStage: true,
        notes: {
          orderBy: { createdAt: "desc" },
          take: 10,
        },
        tasks: {
          orderBy: { dueDate: "asc" },
          where: {
            status: { in: ["PENDING", "IN_PROGRESS"] },
          },
          take: 5,
        },
        activities: {
          orderBy: { performedAt: "desc" },
          take: 10,
        },
        documents: {
          orderBy: { createdAt: "desc" },
          take: 5,
        },
      },
    });

    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    return NextResponse.json(lead);
  } catch (error) {
    console.error("Error fetching lead:", error);
    return NextResponse.json(
      { error: "Failed to fetch lead" },
      { status: 500 }
    );
  }
}

// PUT /api/leads/[id] - Update a lead
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await getApiAuthContext();
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    // Validate update data
    const validationResult = updateLeadSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validationResult.error.format() },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    // Get existing lead
    const existingLead = await prisma.lead.findFirst({
      where: {
        id,
        orgId: auth.orgId,
      },
    });

    if (!existingLead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
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

    // Check for duplicate email (if email is being changed)
    if (data.email && data.email !== existingLead.email) {
      const duplicate = await prisma.lead.findFirst({
        where: {
          orgId: auth.orgId,
          email: data.email,
          id: { not: id },
        },
      });
      if (duplicate) {
        return NextResponse.json(
          { error: "A lead with this email already exists" },
          { status: 409 }
        );
      }
    }

    // Update lead
    const updatedLead = await prisma.lead.update({
      where: { id },
      data: {
        ...data,
        // Merge custom fields
        customFields: data.customFields
          ? {
              ...(existingLead.customFields as object),
              ...data.customFields,
            }
          : undefined,
      },
      include: {
        pipelineStage: true,
      },
    });

    // Audit log
    await createAuditLog({
      orgId: auth.orgId,
      action: "UPDATE",
      module: "LEAD",
      recordId: id,
      actorType: "USER",
      actorId: auth.userId,
      previousState: existingLead as unknown as Record<string, unknown>,
      newState: updatedLead as unknown as Record<string, unknown>,
    });

    return NextResponse.json(updatedLead);
  } catch (error) {
    console.error("Error updating lead:", error);
    return NextResponse.json(
      { error: "Failed to update lead" },
      { status: 500 }
    );
  }
}

// DELETE /api/leads/[id] - Delete a lead
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await getApiAuthContext();
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Get existing lead
    const existingLead = await prisma.lead.findFirst({
      where: {
        id,
        orgId: auth.orgId,
      },
    });

    if (!existingLead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    // Delete lead (cascade will handle related records)
    await prisma.lead.delete({
      where: { id },
    });

    // Audit log
    await createAuditLog({
      orgId: auth.orgId,
      action: "DELETE",
      module: "LEAD",
      recordId: id,
      actorType: "USER",
      actorId: auth.userId,
      previousState: existingLead as unknown as Record<string, unknown>,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting lead:", error);
    return NextResponse.json(
      { error: "Failed to delete lead" },
      { status: 500 }
    );
  }
}
