/**
 * Invoice Payments API
 * GET - List payments for an invoice
 * POST - Record a new payment
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { getApiAuthContext } from "@/lib/auth";
import { requirePermission } from "@/lib/permissions";
import { createAuditLog } from "@/lib/audit";
import { revalidateInvoiceCaches } from "@/lib/cache-utils";
import prisma from "@/lib/db";
import { recordPaymentSchema } from "@/lib/validation/invoices";
import { determineInvoiceStatus } from "@/lib/invoices";
import { Decimal } from "@prisma/client/runtime/library";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/invoices/[id]/payments
 * List all payments for an invoice
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

    // Verify invoice exists and belongs to org
    const invoice = await prisma.invoice.findFirst({
      where: {
        id,
        orgId: authContext.orgId,
      },
      select: { id: true },
    });

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    // Get payments
    const payments = await prisma.payment.findMany({
      where: { invoiceId: id },
      orderBy: { paymentDate: "desc" },
    });

    return NextResponse.json({ payments });
  } catch (error) {
    console.error("[Invoice Payments GET] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch payments" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/invoices/[id]/payments
 * Record a new payment for an invoice
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
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
    const invoice = await prisma.invoice.findFirst({
      where: {
        id,
        orgId: authContext.orgId,
      },
    });

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    // Can't record payment for cancelled/void invoices
    if (["CANCELLED", "VOID"].includes(invoice.status)) {
      return NextResponse.json(
        { error: `Cannot record payment for ${invoice.status.toLowerCase()} invoice` },
        { status: 400 }
      );
    }

    // Can't record payment for draft invoices
    if (invoice.status === "DRAFT") {
      return NextResponse.json(
        { error: "Cannot record payment for draft invoice. Send the invoice first." },
        { status: 400 }
      );
    }

    const body = await request.json();
    const data = recordPaymentSchema.parse(body);

    // Check if payment amount exceeds amount due
    const amountDue = invoice.amountDue.toNumber();
    if (data.amount > amountDue) {
      return NextResponse.json(
        { error: `Payment amount (${data.amount}) exceeds amount due (${amountDue})` },
        { status: 400 }
      );
    }

    // Create payment
    const payment = await prisma.payment.create({
      data: {
        orgId: authContext.orgId,
        invoiceId: id,
        amount: data.amount,
        paymentDate: data.paymentDate || new Date(),
        method: data.method,
        reference: data.reference,
        notes: data.notes,
        recordedById: authContext.userId,
        recordedByType: "USER",
      },
    });

    // Update invoice amounts
    const newAmountPaid = invoice.amountPaid.toNumber() + data.amount;
    const newAmountDue = invoice.total.toNumber() - newAmountPaid;

    // Determine new status
    const newStatus = determineInvoiceStatus(
      invoice.status,
      invoice.dueDate,
      newAmountDue,
      newAmountPaid,
      invoice.total
    );

    // Update invoice
    const updatedInvoice = await prisma.invoice.update({
      where: { id },
      data: {
        amountPaid: new Decimal(newAmountPaid.toFixed(2)),
        amountDue: new Decimal(newAmountDue.toFixed(2)),
        status: newStatus,
        paidAt: newStatus === "PAID" ? new Date() : invoice.paidAt,
      },
    });

    // Create audit log
    await createAuditLog({
      orgId: authContext.orgId,
      action: "CREATE",
      module: "PAYMENT",
      recordId: payment.id,
      actorType: "USER",
      actorId: authContext.userId,
      newState: payment,
      metadata: {
        invoiceId: id,
        invoiceNumber: invoice.invoiceNumber,
        previousAmountPaid: invoice.amountPaid.toNumber(),
        newAmountPaid,
        previousStatus: invoice.status,
        newStatus,
      },
    });

    revalidateInvoiceCaches();

    return NextResponse.json({
      payment,
      invoice: {
        id: updatedInvoice.id,
        status: updatedInvoice.status,
        amountPaid: updatedInvoice.amountPaid,
        amountDue: updatedInvoice.amountDue,
      },
    }, { status: 201 });
  } catch (error) {
    console.error("[Invoice Payments POST] Error:", error);
    
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json(
        { error: "Invalid input", details: error },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to record payment" },
      { status: 500 }
    );
  }
}
