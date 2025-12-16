import { NextRequest, NextResponse } from "next/server";
import { getApiAuthContext } from "@/lib/auth";
import prisma from "@/lib/db";
import { Prisma } from "@prisma/client";
import { createAuditLog } from "@/lib/audit";
import { updateAccountSchema } from "@/lib/validation/schemas";
import { validateCustomFields } from "@/lib/validation/custom-fields";
import { cleanupOrphanedRelationships } from "@/lib/relationships";
import { triggerNewCustomerPlaybooks } from "@/lib/playbook-triggers";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/accounts/[id] - Get a single account
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await getApiAuthContext();
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const account = await prisma.account.findFirst({
      where: {
        id,
        orgId: auth.orgId,
      },
      include: {
        contacts: {
          orderBy: [{ isPrimary: "desc" }, { createdAt: "desc" }],
          take: 10,
        },
        opportunities: {
          orderBy: { createdAt: "desc" },
          include: {
            stage: true,
          },
          take: 10,
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
        documents: {
          orderBy: { createdAt: "desc" },
          take: 5,
        },
        _count: {
          select: {
            contacts: true,
            opportunities: true,
            notes: true,
            tasks: true,
          },
        },
      },
    });

    if (!account) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    return NextResponse.json(account);
  } catch (error) {
    console.error("Error fetching account:", error);
    return NextResponse.json(
      { error: "Failed to fetch account" },
      { status: 500 }
    );
  }
}

// PUT /api/accounts/[id] - Update an account
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await getApiAuthContext();
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    // Validate update data
    const validationResult = updateAccountSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validationResult.error.format() },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    // Get existing account
    const existingAccount = await prisma.account.findFirst({
      where: {
        id,
        orgId: auth.orgId,
      },
    });

    if (!existingAccount) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    // Validate custom fields if present
    if (data.customFields && Object.keys(data.customFields).length > 0) {
      const customFieldValidation = await validateCustomFields(
        auth.orgId,
        "ACCOUNT",
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

    // Build update data with proper JSON handling
    const updateData: Prisma.AccountUpdateInput = {
      name: data.name,
      type: data.type,
      industry: data.industry,
      website: data.website,
      phone: data.phone,
      annualRevenue: data.annualRevenue,
      employeeCount: data.employeeCount,
      rating: data.rating,
      assignedToId: data.assignedToId,
    };

    // Handle address JSON field
    if (data.address !== undefined) {
      updateData.address = data.address === null 
        ? Prisma.JsonNull 
        : (data.address as Prisma.InputJsonValue);
    }

    // Handle customFields JSON field
    if (data.customFields) {
      updateData.customFields = {
        ...(existingAccount.customFields as object),
        ...data.customFields,
      } as Prisma.InputJsonValue;
    }

    // Check if type is changing to CUSTOMER (for trigger)
    const isBecomingCustomer = 
      data.type === "CUSTOMER" && 
      existingAccount.type !== "CUSTOMER";

    // Update account
    const updatedAccount = await prisma.account.update({
      where: { id },
      data: updateData,
    });

    // Trigger NEW_CUSTOMER playbooks if applicable
    if (isBecomingCustomer) {
      // Run in background, don't block the response
      triggerNewCustomerPlaybooks(auth.orgId, id).catch((error) => {
        console.error("Failed to trigger NEW_CUSTOMER playbooks:", error);
      });
    }

    // Audit log
    await createAuditLog({
      orgId: auth.orgId,
      action: "UPDATE",
      module: "ACCOUNT",
      recordId: id,
      actorType: "USER",
      actorId: auth.userId,
      previousState: existingAccount as unknown as Record<string, unknown>,
      newState: updatedAccount as unknown as Record<string, unknown>,
    });

    return NextResponse.json(updatedAccount);
  } catch (error) {
    console.error("Error updating account:", error);
    return NextResponse.json(
      { error: "Failed to update account" },
      { status: 500 }
    );
  }
}

// DELETE /api/accounts/[id] - Delete an account
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await getApiAuthContext();
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Get existing account
    const existingAccount = await prisma.account.findFirst({
      where: {
        id,
        orgId: auth.orgId,
      },
      include: {
        _count: {
          select: { contacts: true, opportunities: true },
        },
      },
    });

    if (!existingAccount) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    // Warning: This will cascade delete related records
    // In production, you might want to prevent deletion if there are related records
    if (existingAccount._count.opportunities > 0) {
      return NextResponse.json(
        {
          error: "Cannot delete account with opportunities. Please delete or reassign opportunities first.",
        },
        { status: 400 }
      );
    }

    // Delete account (cascade will handle related records)
    await prisma.account.delete({
      where: { id },
    });

    // Clean up orphaned relationships in other modules
    // This sets any relationship fields pointing to this account to null
    const cleanupResult = await cleanupOrphanedRelationships(
      auth.orgId,
      "accounts",
      id
    );
    
    if (cleanupResult.errors.length > 0) {
      console.warn("Relationship cleanup warnings:", cleanupResult.errors);
    }

    // Audit log
    await createAuditLog({
      orgId: auth.orgId,
      action: "DELETE",
      module: "ACCOUNT",
      recordId: id,
      actorType: "USER",
      actorId: auth.userId,
      previousState: existingAccount as unknown as Record<string, unknown>,
      metadata: {
        relationshipsCleanedUp: cleanupResult.cleaned,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting account:", error);
    return NextResponse.json(
      { error: "Failed to delete account" },
      { status: 500 }
    );
  }
}
