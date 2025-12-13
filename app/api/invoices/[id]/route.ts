/**
 * Single Invoice API
 * GET - Get invoice details
 * PUT - Update invoice
 * DELETE - Delete invoice
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { getApiAuthContext } from "@/lib/auth";
import { requirePermission } from "@/lib/permissions";
import { createAuditLog } from "@/lib/audit";
import { revalidateInvoiceCaches } from "@/lib/cache-utils";
import prisma from "@/lib/db";
import { updateInvoiceSchema } from "@/lib/validation/invoices";
import {
  calculateInvoiceTotals,
  calculateItemAmount,
} from "@/lib/invoices";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/invoices/[id]
 * Get invoice details
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const authContext = await getApiAuthContext();
    if (!authContext) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Check permission
    await requirePermission(
      authContext.userId,
      authContext.orgId,
      "invoices",
      "view"
    );

    const invoice = await prisma.invoice.findFirst({
      where: {
        id,
        orgId: authContext.orgId,
      },
      include: {
        account: {
          select: {
            id: true,
            name: true,
            website: true,
            phone: true,
            address: true,
          },
        },
        contact: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
        opportunity: {
          select: {
            id: true,
            name: true,
            value: true,
          },
        },
        items: {
          orderBy: { sortOrder: "asc" },
        },
        payments: {
          orderBy: { paymentDate: "desc" },
        },
      },
    });

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    return NextResponse.json(invoice);
  } catch (error) {
    console.error("[Invoice GET] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch invoice" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/invoices/[id]
 * Update invoice
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const authContext = await getApiAuthContext();
    if (!authContext) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Check permission
    await requirePermission(
      authContext.userId,
      authContext.orgId,
      "invoices",
      "edit"
    );

    // Get existing invoice
    const existingInvoice = await prisma.invoice.findFirst({
      where: {
        id,
        orgId: authContext.orgId,
      },
      include: {
        items: true,
      },
    });

    if (!existingInvoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    // Can't edit paid, cancelled, or void invoices (except to cancel/void)
    if (["PAID", "CANCELLED", "VOID"].includes(existingInvoice.status)) {
      const body = await request.json();
      // Only allow status changes for these
      if (body.status && ["CANCELLED", "VOID"].includes(body.status)) {
        const updated = await prisma.invoice.update({
          where: { id },
          data: { status: body.status },
        });
        
        await createAuditLog({
          orgId: authContext.orgId,
          action: "UPDATE",
          module: "INVOICE",
          recordId: id,
          actorType: "USER",
          actorId: authContext.userId,
          previousState: existingInvoice,
          newState: updated,
        });
        
        revalidateInvoiceCaches();
        return NextResponse.json(updated);
      }
      
      return NextResponse.json(
        { error: `Cannot edit ${existingInvoice.status.toLowerCase()} invoice` },
        { status: 400 }
      );
    }

    const body = await request.json();
    const data = updateInvoiceSchema.parse(body);

    // Prepare update data
    const updateData: Record<string, unknown> = {};

    if (data.accountId) updateData.accountId = data.accountId;
    if (data.contactId !== undefined) updateData.contactId = data.contactId;
    if (data.opportunityId !== undefined) updateData.opportunityId = data.opportunityId;
    if (data.status) updateData.status = data.status;
    if (data.issueDate) updateData.issueDate = data.issueDate;
    if (data.dueDate) updateData.dueDate = data.dueDate;
    if (data.currency) updateData.currency = data.currency;
    if (data.taxRate !== undefined) updateData.taxRate = data.taxRate;
    if (data.discountType !== undefined) updateData.discountType = data.discountType;
    if (data.discountValue !== undefined) updateData.discountValue = data.discountValue;
    if (data.notes !== undefined) updateData.notes = data.notes;
    if (data.terms !== undefined) updateData.terms = data.terms;
    if (data.footer !== undefined) updateData.footer = data.footer;
    if (data.billingAddress !== undefined) updateData.billingAddress = data.billingAddress;
    if (data.customFields) updateData.customFields = data.customFields;

    // If items are provided, recalculate totals
    if (data.items) {
      // Delete existing items
      await prisma.invoiceItem.deleteMany({
        where: { invoiceId: id },
      });

      // Calculate item amounts
      const itemsWithAmounts = data.items.map((item, index) => ({
        invoiceId: id,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        amount: calculateItemAmount(item.quantity, item.unitPrice),
        itemCode: item.itemCode,
        sortOrder: item.sortOrder ?? index,
      }));

      // Create new items
      await prisma.invoiceItem.createMany({
        data: itemsWithAmounts,
      });

      // Calculate totals
      const totals = calculateInvoiceTotals(
        itemsWithAmounts,
        data.taxRate ?? existingInvoice.taxRate,
        data.discountType ?? existingInvoice.discountType,
        data.discountValue ?? existingInvoice.discountValue,
        existingInvoice.amountPaid
      );

      updateData.subtotal = totals.subtotal;
      updateData.taxAmount = totals.taxAmount;
      updateData.discountAmount = totals.discountAmount;
      updateData.total = totals.total;
      updateData.amountDue = totals.amountDue;
    } else if (data.taxRate !== undefined || data.discountType !== undefined || data.discountValue !== undefined) {
      // Recalculate totals if tax or discount changed
      const totals = calculateInvoiceTotals(
        existingInvoice.items,
        data.taxRate ?? existingInvoice.taxRate,
        data.discountType ?? existingInvoice.discountType,
        data.discountValue ?? existingInvoice.discountValue,
        existingInvoice.amountPaid
      );

      updateData.subtotal = totals.subtotal;
      updateData.taxAmount = totals.taxAmount;
      updateData.discountAmount = totals.discountAmount;
      updateData.total = totals.total;
      updateData.amountDue = totals.amountDue;
    }

    // Update invoice
    const invoice = await prisma.invoice.update({
      where: { id },
      data: updateData,
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
        items: {
          orderBy: { sortOrder: "asc" },
        },
      },
    });

    // Create audit log
    await createAuditLog({
      orgId: authContext.orgId,
      action: "UPDATE",
      module: "INVOICE",
      recordId: id,
      actorType: "USER",
      actorId: authContext.userId,
      previousState: existingInvoice,
      newState: invoice,
    });

    revalidateInvoiceCaches();

    return NextResponse.json(invoice);
  } catch (error) {
    console.error("[Invoice PUT] Error:", error);
    
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json(
        { error: "Invalid input", details: error },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to update invoice" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/invoices/[id]
 * Delete invoice (only drafts can be deleted, others should be voided)
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const authContext = await getApiAuthContext();
    if (!authContext) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Check permission
    await requirePermission(
      authContext.userId,
      authContext.orgId,
      "invoices",
      "delete"
    );

    // Get existing invoice
    const existingInvoice = await prisma.invoice.findFirst({
      where: {
        id,
        orgId: authContext.orgId,
      },
    });

    if (!existingInvoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    // Only allow deletion of draft invoices
    if (existingInvoice.status !== "DRAFT") {
      return NextResponse.json(
        { error: "Only draft invoices can be deleted. Use void for sent invoices." },
        { status: 400 }
      );
    }

    // Delete invoice (items will cascade)
    await prisma.invoice.delete({
      where: { id },
    });

    // Create audit log
    await createAuditLog({
      orgId: authContext.orgId,
      action: "DELETE",
      module: "INVOICE",
      recordId: id,
      actorType: "USER",
      actorId: authContext.userId,
      previousState: existingInvoice,
    });

    revalidateInvoiceCaches();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Invoice DELETE] Error:", error);
    return NextResponse.json(
      { error: "Failed to delete invoice" },
      { status: 500 }
    );
  }
}
