/**
 * Send Invoice API
 * POST - Send invoice via email
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { getApiAuthContext } from "@/lib/auth";
import { checkPermission } from "@/lib/api-permissions";
import { createAuditLog } from "@/lib/audit";
import { revalidateInvoiceCaches } from "@/lib/cache-utils";
import prisma from "@/lib/db";
import { sendInvoiceSchema } from "@/lib/validation/invoices";
import { createGmailClient, hasGoogleConnection } from "@/lib/integrations/google";
import { formatCurrency } from "@/lib/invoices";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/invoices/[id]/send
 * Send invoice via email
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const authContext = await getApiAuthContext();
    if (!authContext) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Check permission
    const hasPermission = await checkPermission(
      authContext.userId,
      authContext.orgId,
      "invoices",
      "edit"
    );
    if (!hasPermission) {
      return NextResponse.json({ error: "Permission denied" }, { status: 403 });
    }

    // Get invoice with details
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

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    // Can't send cancelled/void/paid invoices
    if (["CANCELLED", "VOID", "PAID"].includes(invoice.status)) {
      return NextResponse.json(
        { error: `Cannot send ${invoice.status.toLowerCase()} invoice` },
        { status: 400 }
      );
    }

    const body = await request.json();
    const data = sendInvoiceSchema.parse(body);

    // Check if Google is connected for sending email
    const googleConnected = await hasGoogleConnection(authContext.orgId);
    
    if (!googleConnected) {
      return NextResponse.json(
        { error: "Google integration not connected. Please connect Google in Settings > Integrations to send emails." },
        { status: 400 }
      );
    }

    // Build email content
    const contactName = invoice.contact 
      ? `${invoice.contact.firstName} ${invoice.contact.lastName}`
      : invoice.account.name;
    
    const subject = data.subject || `Invoice ${invoice.invoiceNumber} from Y CRM`;
    
    const defaultMessage = `Dear ${contactName},

Please find attached invoice ${invoice.invoiceNumber} for ${formatCurrency(invoice.total, invoice.currency)}.

Invoice Details:
- Invoice Number: ${invoice.invoiceNumber}
- Issue Date: ${invoice.issueDate.toLocaleDateString()}
- Due Date: ${invoice.dueDate.toLocaleDateString()}
- Amount Due: ${formatCurrency(invoice.amountDue, invoice.currency)}

${invoice.items.map(item => `• ${item.description}: ${formatCurrency(item.amount, invoice.currency)}`).join('\n')}

${invoice.notes ? `\nNotes: ${invoice.notes}` : ''}
${invoice.terms ? `\nTerms: ${invoice.terms}` : ''}

Thank you for your business!`;

    const message = data.message || defaultMessage;

    try {
      // Send email via Gmail
      const gmail = createGmailClient(authContext.orgId);
      
      await gmail.sendEmail({
        to: data.to,
        cc: data.cc,
        subject,
        body: message,
      });

      // Update invoice status to SENT
      const updatedInvoice = await prisma.invoice.update({
        where: { id },
        data: {
          status: invoice.status === "DRAFT" ? "SENT" : invoice.status,
          sentAt: new Date(),
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
        previousState: { status: invoice.status, sentAt: invoice.sentAt },
        newState: { status: updatedInvoice.status, sentAt: updatedInvoice.sentAt },
        metadata: {
          action: "SEND_EMAIL",
          to: data.to,
          cc: data.cc,
          subject,
        },
      });

      revalidateInvoiceCaches();

      return NextResponse.json({
        success: true,
        message: `Invoice sent to ${data.to}`,
        invoice: {
          id: updatedInvoice.id,
          status: updatedInvoice.status,
          sentAt: updatedInvoice.sentAt,
        },
      });
    } catch (emailError) {
      console.error("[Send Invoice] Email error:", emailError);
      return NextResponse.json(
        { error: "Failed to send email. Please check your Google integration." },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("[Send Invoice] Error:", error);
    
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json(
        { error: "Invalid input", details: error },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to send invoice" },
      { status: 500 }
    );
  }
}
