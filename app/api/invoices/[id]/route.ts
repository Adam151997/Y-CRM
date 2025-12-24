/**
 * Single Invoice API
 * GET - Get invoice details
 * PUT - Update invoice (with stock restoration on cancellation/void)
 * DELETE - Delete invoice (with stock restoration)
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { getApiAuthContext } from "@/lib/auth";
import { requirePermission, PermissionError } from "@/lib/permissions";
import { createAuditLog } from "@/lib/audit";
import { revalidateInvoiceCaches } from "@/lib/cache-utils";
import prisma from "@/lib/db";
import { updateInvoiceSchema } from "@/lib/validation/invoices";
import {
  calculateInvoiceTotals,
  calculateItemAmount,
} from "@/lib/invoices";
import { restoreStockAtomic } from "@/lib/inventory/transactions";

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
    
    if (error instanceof PermissionError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }
    
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

    const body = await request.json();
    
    // For non-DRAFT invoices, only allow status changes
    if (existingInvoice.status !== "DRAFT") {
      // Only allow specific status transitions
      if (body.status) {
        const allowedTransitions: Record<string, string[]> = {
          SENT: ["VIEWED", "PAID", "PARTIALLY_PAID", "OVERDUE", "VOID", "CANCELLED"],
          VIEWED: ["PAID", "PARTIALLY_PAID", "OVERDUE", "VOID", "CANCELLED"],
          PARTIALLY_PAID: ["PAID", "OVERDUE", "VOID"],
          OVERDUE: ["PAID", "PARTIALLY_PAID", "VOID"],
          PAID: [], // No transitions allowed from PAID
          CANCELLED: [], // No transitions allowed from CANCELLED
          VOID: [], // No transitions allowed from VOID
        };
        
        const allowed = allowedTransitions[existingInvoice.status] || [];
        
        if (!allowed.includes(body.status)) {
          return NextResponse.json(
            { error: `Cannot change status from ${existingInvoice.status} to ${body.status}` },
            { status: 400 }
          );
        }

        // Execute status change with potential stock restoration in a transaction
        const result = await prisma.$transaction(async (tx) => {
          const updateData: Record<string, unknown> = { status: body.status };

          // Set paidAt timestamp and update amounts when marking as PAID
          if (body.status === "PAID") {
            updateData.paidAt = new Date();
            updateData.amountPaid = existingInvoice.total;
            updateData.amountDue = 0;
          }

          // Restore stock when cancelling or voiding invoice
          if (body.status === "CANCELLED" || body.status === "VOID") {
            const stockResult = await restoreStockAtomic(
              tx,
              authContext.orgId,
              id,
              authContext.userId,
              "USER"
            );

            if (!stockResult.success) {
              throw new Error(stockResult.error || "Failed to restore stock");
            }
          }

          return tx.invoice.update({
            where: { id },
            data: updateData,
          });
        });

        await createAuditLog({
          orgId: authContext.orgId,
          action: "UPDATE",
          module: "INVOICE",
          recordId: id,
          actorType: "USER",
          actorId: authContext.userId,
          previousState: existingInvoice,
          newState: result,
          metadata: {
            statusChange: `${existingInvoice.status} -> ${body.status}`,
            stockRestored: body.status === "CANCELLED" || body.status === "VOID",
          },
        });

        revalidateInvoiceCaches();
        return NextResponse.json(result);
      }
      
      return NextResponse.json(
        { error: "Only draft invoices can be fully edited. Non-draft invoices only allow status changes." },
        { status: 400 }
      );
    }

    // DRAFT invoices can be fully edited
    const data = updateInvoiceSchema.parse(body);

    // Prepare update data
    const updateData: Record<string, unknown> = {};

    if (data.accountId) updateData.accountId = data.accountId;
    if (data.contactId !== undefined) updateData.contactId = data.contactId;
    if (data.opportunityId !== undefined) updateData.opportunityId = data.opportunityId;
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

    // Handle status change from DRAFT
    if (data.status) {
      updateData.status = data.status;
      
      // When changing from DRAFT to PAID, set payment fields
      if (data.status === "PAID") {
        updateData.paidAt = new Date();
        // Will be set after totals calculation below
      }
    }

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

    // If status is changing to PAID, set payment amounts based on final total
    if (data.status === "PAID") {
      // Use the calculated total or existing total
      const finalTotal = updateData.total ?? existingInvoice.total;
      updateData.amountPaid = finalTotal;
      updateData.amountDue = 0;
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
    
    if (error instanceof PermissionError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }
    
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

    // Delete invoice and restore stock in a transaction
    const deleteResult = await prisma.$transaction(async (tx) => {
      // Restore stock for any inventory-linked items
      const stockResult = await restoreStockAtomic(
        tx,
        authContext.orgId,
        id,
        authContext.userId,
        "USER"
      );

      // Delete invoice (items will cascade)
      await tx.invoice.delete({
        where: { id },
      });

      return { stockRestored: stockResult.restoredItems };
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
      metadata: {
        stockItemsRestored: deleteResult.stockRestored,
      },
    });

    revalidateInvoiceCaches();

    return NextResponse.json({
      success: true,
      stockItemsRestored: deleteResult.stockRestored,
    });
  } catch (error) {
    console.error("[Invoice DELETE] Error:", error);
    
    if (error instanceof PermissionError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }
    
    return NextResponse.json(
      { error: "Failed to delete invoice" },
      { status: 500 }
    );
  }
}
