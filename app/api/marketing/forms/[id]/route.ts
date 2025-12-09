import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";
import prisma from "@/lib/db";
import { createAuditLog } from "@/lib/audit";
import { z } from "zod";

// GET /api/marketing/forms/[id] - Get a single form
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { orgId } = await getAuthContext();
    const { id } = await params;

    const form = await prisma.form.findFirst({
      where: { id, orgId },
      include: {
        formSubmissions: {
          orderBy: { createdAt: "desc" },
          take: 20,
        },
        _count: {
          select: { formSubmissions: true },
        },
      },
    });

    if (!form) {
      return NextResponse.json(
        { error: "Form not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ form });
  } catch (error) {
    console.error("Error fetching form:", error);
    return NextResponse.json(
      { error: "Failed to fetch form" },
      { status: 500 }
    );
  }
}

// Form field schema
const formFieldSchema = z.object({
  id: z.string(),
  type: z.enum(["text", "email", "phone", "textarea", "select", "checkbox", "radio", "number", "date"]),
  label: z.string(),
  required: z.boolean().default(false),
  placeholder: z.string().optional(),
  options: z.array(z.string()).optional(),
  validation: z.any().optional(),
});

// Update schema
const updateFormSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().optional().nullable(),
  fields: z.array(formFieldSchema).optional(),
  settings: z.any().optional(),
  createLead: z.boolean().optional(),
  assignToUserId: z.string().optional().nullable(),
  leadSource: z.string().optional(),
  slug: z.string().optional(),
  isActive: z.boolean().optional(),
});

// PUT /api/marketing/forms/[id] - Update a form
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { orgId, userId } = await getAuthContext();
    const { id } = await params;
    const body = await request.json();

    // Validate request body
    const validationResult = updateFormSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Invalid request data", details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    // Check if form exists
    const existingForm = await prisma.form.findFirst({
      where: { id, orgId },
    });

    if (!existingForm) {
      return NextResponse.json(
        { error: "Form not found" },
        { status: 404 }
      );
    }

    // If slug is being changed, check uniqueness
    if (data.slug && data.slug !== existingForm.slug) {
      const slugExists = await prisma.form.findFirst({
        where: { orgId, slug: data.slug, NOT: { id } },
      });
      if (slugExists) {
        return NextResponse.json(
          { error: "Slug already in use" },
          { status: 400 }
        );
      }
    }

    // Build update data
    const updateData: Record<string, unknown> = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.fields !== undefined) updateData.fields = data.fields;
    if (data.settings !== undefined) updateData.settings = data.settings;
    if (data.createLead !== undefined) updateData.createLead = data.createLead;
    if (data.assignToUserId !== undefined) updateData.assignToUserId = data.assignToUserId;
    if (data.leadSource !== undefined) updateData.leadSource = data.leadSource;
    if (data.slug !== undefined) updateData.slug = data.slug;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;

    // Update form
    const form = await prisma.form.update({
      where: { id },
      data: updateData,
    });

    // Audit log
    await createAuditLog({
      orgId,
      action: "UPDATE",
      module: "FORM",
      recordId: form.id,
      actorType: "USER",
      actorId: userId,
      previousState: existingForm as unknown as Record<string, unknown>,
      newState: form as unknown as Record<string, unknown>,
    });

    return NextResponse.json({ form });
  } catch (error) {
    console.error("Error updating form:", error);
    return NextResponse.json(
      { error: "Failed to update form" },
      { status: 500 }
    );
  }
}

// DELETE /api/marketing/forms/[id] - Delete a form
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { orgId, userId } = await getAuthContext();
    const { id } = await params;

    // Check if form exists
    const existingForm = await prisma.form.findFirst({
      where: { id, orgId },
    });

    if (!existingForm) {
      return NextResponse.json(
        { error: "Form not found" },
        { status: 404 }
      );
    }

    // Delete form (cascades to submissions)
    await prisma.form.delete({
      where: { id },
    });

    // Audit log
    await createAuditLog({
      orgId,
      action: "DELETE",
      module: "FORM",
      recordId: id,
      actorType: "USER",
      actorId: userId,
      previousState: existingForm as unknown as Record<string, unknown>,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting form:", error);
    return NextResponse.json(
      { error: "Failed to delete form" },
      { status: 500 }
    );
  }
}
