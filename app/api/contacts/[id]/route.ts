import { NextRequest, NextResponse } from "next/server";
import { getApiAuthContext } from "@/lib/auth";
import prisma from "@/lib/db";
import { Prisma } from "@prisma/client";
import { createAuditLog } from "@/lib/audit";
import { updateContactSchema } from "@/lib/validation/schemas";
import { validateCustomFields } from "@/lib/validation/custom-fields";
import { 
  getRoutePermissionContext, 
  filterToAllowedFields,
  validateEditFields,
  checkRecordAccess,
} from "@/lib/api-permissions";
import { cleanupOrphanedRelationships } from "@/lib/relationships";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/contacts/[id] - Get a single contact
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await getApiAuthContext();
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get permission context
    const permCtx = await getRoutePermissionContext(auth.userId, auth.orgId, "contacts", "view");
    if (!permCtx.allowed) {
      return NextResponse.json({ error: "You don't have permission to view contacts" }, { status: 403 });
    }

    const { id } = await params;

    const contact = await prisma.contact.findFirst({
      where: {
        id,
        orgId: auth.orgId,
      },
      include: {
        account: {
          select: { id: true, name: true, industry: true, website: true },
        },
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
      },
    });

    if (!contact) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }

    // Check record-level access
    const accessError = checkRecordAccess(permCtx.recordVisibility, auth.userId, contact.assignedToId);
    if (accessError) return accessError;

    // Apply field-level filtering
    const filteredContact = filterToAllowedFields(
      contact as unknown as Record<string, unknown>,
      permCtx.allowedViewFields
    );

    return NextResponse.json(filteredContact);
  } catch (error) {
    console.error("Error fetching contact:", error);
    return NextResponse.json(
      { error: "Failed to fetch contact" },
      { status: 500 }
    );
  }
}

// PUT /api/contacts/[id] - Update a contact
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await getApiAuthContext();
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get permission context
    const permCtx = await getRoutePermissionContext(auth.userId, auth.orgId, "contacts", "edit");
    if (!permCtx.allowed) {
      return NextResponse.json({ error: "You don't have permission to edit contacts" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();

    // Get existing contact
    const existingContact = await prisma.contact.findFirst({
      where: {
        id,
        orgId: auth.orgId,
      },
    });

    if (!existingContact) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }

    // Check record-level access
    const accessError = checkRecordAccess(permCtx.recordVisibility, auth.userId, existingContact.assignedToId);
    if (accessError) return accessError;

    // Validate update data
    const validationResult = updateContactSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validationResult.error.format() },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    // Validate field-level permissions
    const fieldValidation = validateEditFields(
      data as Record<string, unknown>,
      permCtx.allowedEditFields,
      ["customFields"]
    );
    if (!fieldValidation.valid) {
      return NextResponse.json(
        { error: `You don't have permission to edit these fields: ${fieldValidation.disallowedFields.join(", ")}` },
        { status: 403 }
      );
    }

    // Validate custom fields if present
    if (data.customFields && Object.keys(data.customFields).length > 0) {
      const customFieldValidation = await validateCustomFields(
        auth.orgId,
        "CONTACT",
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
    if (data.email && data.email !== existingContact.email) {
      const duplicate = await prisma.contact.findFirst({
        where: {
          orgId: auth.orgId,
          email: data.email,
          id: { not: id },
        },
      });
      if (duplicate) {
        return NextResponse.json(
          { error: "A contact with this email already exists" },
          { status: 409 }
        );
      }
    }

    // Verify account exists if being changed
    if (data.accountId && data.accountId !== existingContact.accountId) {
      const account = await prisma.account.findFirst({
        where: { id: data.accountId, orgId: auth.orgId },
      });
      if (!account) {
        return NextResponse.json(
          { error: "Account not found" },
          { status: 400 }
        );
      }
    }

    // Build update data with proper JSON handling
    const updateData: Prisma.ContactUpdateInput = {
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      phone: data.phone,
      title: data.title,
      department: data.department,
      isPrimary: data.isPrimary,
      assignedToId: data.assignedToId,
    };

    // Handle accountId relation
    if (data.accountId !== undefined) {
      updateData.account = data.accountId 
        ? { connect: { id: data.accountId } }
        : { disconnect: true };
    }

    // Handle customFields JSON field
    if (data.customFields) {
      updateData.customFields = {
        ...(existingContact.customFields as object),
        ...data.customFields,
      } as Prisma.InputJsonValue;
    }

    // Update contact
    const updatedContact = await prisma.contact.update({
      where: { id },
      data: updateData,
      include: {
        account: {
          select: { id: true, name: true },
        },
      },
    });

    // Audit log
    await createAuditLog({
      orgId: auth.orgId,
      action: "UPDATE",
      module: "CONTACT",
      recordId: id,
      actorType: "USER",
      actorId: auth.userId,
      previousState: existingContact as unknown as Record<string, unknown>,
      newState: updatedContact as unknown as Record<string, unknown>,
    });

    return NextResponse.json(updatedContact);
  } catch (error) {
    console.error("Error updating contact:", error);
    return NextResponse.json(
      { error: "Failed to update contact" },
      { status: 500 }
    );
  }
}

// DELETE /api/contacts/[id] - Delete a contact
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await getApiAuthContext();
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get permission context
    const permCtx = await getRoutePermissionContext(auth.userId, auth.orgId, "contacts", "delete");
    if (!permCtx.allowed) {
      return NextResponse.json({ error: "You don't have permission to delete contacts" }, { status: 403 });
    }

    const { id } = await params;

    // Get existing contact
    const existingContact = await prisma.contact.findFirst({
      where: {
        id,
        orgId: auth.orgId,
      },
    });

    if (!existingContact) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }

    // Check record-level access
    const accessError = checkRecordAccess(permCtx.recordVisibility, auth.userId, existingContact.assignedToId);
    if (accessError) return accessError;

    // Delete contact (cascade will handle related records)
    await prisma.contact.delete({
      where: { id },
    });

    // Clean up orphaned relationships in other modules
    const cleanupResult = await cleanupOrphanedRelationships(
      auth.orgId,
      "contacts",
      id
    );

    // Audit log
    await createAuditLog({
      orgId: auth.orgId,
      action: "DELETE",
      module: "CONTACT",
      recordId: id,
      actorType: "USER",
      actorId: auth.userId,
      previousState: existingContact as unknown as Record<string, unknown>,
      metadata: {
        relationshipsCleanedUp: cleanupResult.cleaned,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting contact:", error);
    return NextResponse.json(
      { error: "Failed to delete contact" },
      { status: 500 }
    );
  }
}
