/**
 * Duplicate Invoice API
 * POST /api/invoices/[id]/duplicate - Create a copy of an existing invoice
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { getApiAuthContext } from "@/lib/auth";
import { requirePermission, PermissionError } from "@/lib/permissions";
import { createAuditLog } from "@/lib/audit";
import { revalidateInvoiceCaches } from "@/lib/cache-utils";
import prisma from "@/lib/db";
import { generateInvoiceNumber } from "@/lib/invoices";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/invoices/[id]/duplicate
 * Create a duplicate of an existing invoice
 */
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const authContext = await getApiAuthContext();
    if (!authContext) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check permission to create invoices
    await requirePermission(
      authContext.userId,
      authContext.orgId,
      "invoices",
      "create"
    );

    const { id } = await context.params;

    // Fetch the original invoice with items
    const originalInvoice = await prisma.invoice.findFirst({
      where: {
        id,
        orgId: authContext.orgId,
      },
      include: {
        items: {
          orderBy: { sortOrder: "asc" },
        },
      },
    });

    if (!originalInvoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    // Generate new invoice number
    const invoiceNumber = await generateInvoiceNumber(authContext.orgId);

    // Calculate new dates (issue date = today, due date = today + original difference)
    const today = new Date();
    const originalDaysDiff = Math.ceil(
      (originalInvoice.dueDate.getTime() - originalInvoice.issueDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    const newDueDate = new Date(today);
    newDueDate.setDate(newDueDate.getDate() + originalDaysDiff);

    // Create the duplicate invoice
    const duplicatedInvoice = await prisma.invoice.create({
      data: {
        orgId: authContext.orgId,
        invoiceNumber,
        status: "DRAFT", // Always start as draft
        
        // Copy relations
        accountId: originalInvoice.accountId,
        contactId: originalInvoice.contactId,
        opportunityId: originalInvoice.opportunityId,
        
        // New dates
        issueDate: today,
        dueDate: newDueDate,
        // Clear sent/viewed/paid dates
        sentAt: null,
        viewedAt: null,
        paidAt: null,
        
        // Copy financials (but reset payment amounts)
        currency: originalInvoice.currency,
        subtotal: originalInvoice.subtotal,
        taxRate: originalInvoice.taxRate,
        taxAmount: originalInvoice.taxAmount,
        discountType: originalInvoice.discountType,
        discountValue: originalInvoice.discountValue,
        discountAmount: originalInvoice.discountAmount,
        total: originalInvoice.total,
        amountPaid: 0, // Reset to zero
        amountDue: originalInvoice.total, // Full amount due
        
        // Copy content
        notes: originalInvoice.notes,
        terms: originalInvoice.terms,
        footer: originalInvoice.footer,
        billingAddress: originalInvoice.billingAddress ?? undefined,
        customFields: originalInvoice.customFields ?? {},
        
        // Attribution
        createdById: authContext.userId,
        createdByType: "USER",
        
        // Copy items
        items: {
          create: originalInvoice.items.map((item, index) => ({
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            amount: item.amount,
            itemCode: item.itemCode,
            sortOrder: index,
          })),
        },
      },
      include: {
        account: {
          select: {
            id: true,
            name: true,
          },
        },
        contact: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        items: true,
      },
    });

    // Create audit log
    await createAuditLog({
      orgId: authContext.orgId,
      action: "CREATE",
      module: "INVOICE",
      recordId: duplicatedInvoice.id,
      actorType: "USER",
      actorId: authContext.userId,
      newState: duplicatedInvoice,
      metadata: {
        action: "DUPLICATE",
        sourceInvoiceId: originalInvoice.id,
        sourceInvoiceNumber: originalInvoice.invoiceNumber,
      },
    });

    revalidateInvoiceCaches();

    return NextResponse.json({
      success: true,
      message: `Invoice duplicated as ${invoiceNumber}`,
      invoice: duplicatedInvoice,
    }, { status: 201 });
  } catch (error) {
    console.error("[Duplicate Invoice] Error:", error);
    
    if (error instanceof PermissionError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }

    return NextResponse.json(
      { error: "Failed to duplicate invoice" },
      { status: 500 }
    );
  }
}
