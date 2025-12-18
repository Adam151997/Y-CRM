/**
 * Bulk Export Invoices API
 * POST /api/invoices/bulk-export - Generate a single HTML with multiple invoices for printing to PDF
 * 
 * Accepts an array of invoice IDs and returns a combined HTML document
 * with page breaks between each invoice for easy printing to PDF
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { getApiAuthContext } from "@/lib/auth";
import { requirePermission, PermissionError } from "@/lib/permissions";
import prisma from "@/lib/db";
import { z } from "zod";

const bulkExportSchema = z.object({
  invoiceIds: z.array(z.string().uuid()).min(1).max(50),
});

function formatCurrency(amount: number | string | null, currency: string = "USD"): string {
  const num = typeof amount === "string" ? parseFloat(amount) : Number(amount);
  if (isNaN(num)) return `${currency} 0.00`;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(num);
}

function formatDate(date: Date | string | null): string {
  if (!date) return "-";
  const d = new Date(date);
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

interface InvoiceItem {
  id: string;
  description: string;
  quantity: unknown;
  unitPrice: unknown;
  amount: unknown;
  itemCode: string | null;
}

interface InvoiceData {
  id: string;
  invoiceNumber: string;
  status: string;
  issueDate: Date;
  dueDate: Date;
  sentAt: Date | null;
  paidAt: Date | null;
  currency: string;
  subtotal: unknown;
  taxRate: unknown;
  taxAmount: unknown;
  discountType: string | null;
  discountValue: unknown;
  discountAmount: unknown;
  total: unknown;
  amountPaid: unknown;
  amountDue: unknown;
  notes: string | null;
  terms: string | null;
  billingAddress: unknown;
  account: {
    name: string;
  };
  contact: {
    firstName: string;
    lastName: string;
    email: string | null;
    phone: string | null;
  } | null;
  items: InvoiceItem[];
}

function generateInvoiceHTML(invoice: InvoiceData, brandName: string, isLast: boolean): string {
  const billingAddress = invoice.billingAddress as {
    name?: string;
    street?: string;
    city?: string;
    state?: string;
    zip?: string;
    country?: string;
  } | null;

  return `
    <div class="invoice-page ${!isLast ? 'page-break' : ''}">
      <div class="header">
        <div class="company-info">
          <h1>${brandName}</h1>
        </div>
        <div class="invoice-title">
          <h2>Invoice</h2>
          <p class="invoice-number">${invoice.invoiceNumber}</p>
          <span class="status-badge status-${invoice.status.toLowerCase()}">${invoice.status.replace("_", " ")}</span>
        </div>
      </div>

      <div class="addresses">
        <div class="address-block">
          <h3>Bill To</h3>
          <p class="name">${billingAddress?.name || invoice.account.name}</p>
          ${invoice.contact ? `<p>Attn: ${invoice.contact.firstName} ${invoice.contact.lastName}</p>` : ''}
          ${billingAddress?.street ? `<p>${billingAddress.street}</p>` : ''}
          ${billingAddress?.city || billingAddress?.state ? `<p>${[billingAddress?.city, billingAddress?.state, billingAddress?.zip].filter(Boolean).join(", ")}</p>` : ''}
          ${billingAddress?.country ? `<p>${billingAddress.country}</p>` : ''}
          ${invoice.contact?.email ? `<p>${invoice.contact.email}</p>` : ''}
          ${invoice.contact?.phone ? `<p>${invoice.contact.phone}</p>` : ''}
        </div>
        <div class="address-block">
          <table class="details-table">
            <tr>
              <td>Invoice Number:</td>
              <td><strong>${invoice.invoiceNumber}</strong></td>
            </tr>
            <tr>
              <td>Issue Date:</td>
              <td>${formatDate(invoice.issueDate)}</td>
            </tr>
            <tr>
              <td>Due Date:</td>
              <td>${formatDate(invoice.dueDate)}</td>
            </tr>
            ${invoice.sentAt ? `<tr><td>Sent:</td><td>${formatDate(invoice.sentAt)}</td></tr>` : ''}
            ${invoice.paidAt ? `<tr><td>Paid:</td><td>${formatDate(invoice.paidAt)}</td></tr>` : ''}
          </table>
        </div>
      </div>

      <table class="items-table">
        <thead>
          <tr>
            <th>Description</th>
            <th>Qty</th>
            <th>Unit Price</th>
            <th>Amount</th>
          </tr>
        </thead>
        <tbody>
          ${invoice.items.map(item => `
            <tr>
              <td>
                <div class="item-description">${item.description}</div>
                ${item.itemCode ? `<div class="item-code">SKU: ${item.itemCode}</div>` : ''}
              </td>
              <td>${Number(item.quantity)}</td>
              <td>${formatCurrency(Number(item.unitPrice), invoice.currency)}</td>
              <td>${formatCurrency(Number(item.amount), invoice.currency)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <div class="totals">
        <table class="totals-table">
          <tr>
            <td>Subtotal</td>
            <td>${formatCurrency(Number(invoice.subtotal), invoice.currency)}</td>
          </tr>
          ${Number(invoice.discountAmount) > 0 ? `
          <tr class="discount">
            <td>Discount${invoice.discountType === 'PERCENTAGE' && invoice.discountValue ? ` (${Number(invoice.discountValue)}%)` : ''}</td>
            <td>-${formatCurrency(Number(invoice.discountAmount), invoice.currency)}</td>
          </tr>
          ` : ''}
          ${Number(invoice.taxAmount) > 0 ? `
          <tr>
            <td>Tax${invoice.taxRate ? ` (${Number(invoice.taxRate)}%)` : ''}</td>
            <td>${formatCurrency(Number(invoice.taxAmount), invoice.currency)}</td>
          </tr>
          ` : ''}
          <tr class="total-row">
            <td>Total</td>
            <td>${formatCurrency(Number(invoice.total), invoice.currency)}</td>
          </tr>
          ${Number(invoice.amountPaid) > 0 ? `
          <tr>
            <td>Amount Paid</td>
            <td style="color: #15803d;">-${formatCurrency(Number(invoice.amountPaid), invoice.currency)}</td>
          </tr>
          <tr class="amount-due">
            <td>Amount Due</td>
            <td>${formatCurrency(Number(invoice.amountDue), invoice.currency)}</td>
          </tr>
          ` : ''}
        </table>
      </div>

      ${invoice.notes || invoice.terms ? `
      <div class="notes-terms">
        ${invoice.notes ? `
        <div>
          <h3>Notes</h3>
          <p>${invoice.notes}</p>
        </div>
        ` : ''}
        ${invoice.terms ? `
        <div>
          <h3>Terms & Conditions</h3>
          <p>${invoice.terms}</p>
        </div>
        ` : ''}
      </div>
      ` : ''}

      <div class="footer">
        <p>Thank you for your business!</p>
      </div>
    </div>
  `;
}

export async function POST(request: NextRequest) {
  try {
    const authContext = await getApiAuthContext();
    if (!authContext) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await requirePermission(authContext.userId, authContext.orgId, "invoices", "view");

    const body = await request.json();
    const { invoiceIds } = bulkExportSchema.parse(body);

    // Fetch all invoices and organization in parallel
    const [invoices, organization] = await Promise.all([
      prisma.invoice.findMany({
        where: {
          id: { in: invoiceIds },
          orgId: authContext.orgId,
        },
        include: {
          account: {
            select: {
              name: true,
            },
          },
          contact: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
            },
          },
          items: {
            orderBy: { sortOrder: "asc" },
          },
        },
        orderBy: { invoiceNumber: "asc" },
      }),
      prisma.organization.findUnique({
        where: { id: authContext.orgId },
        select: {
          name: true,
          settings: true,
        },
      }),
    ]);

    if (invoices.length === 0) {
      return NextResponse.json({ error: "No invoices found" }, { status: 404 });
    }

    // Extract branding settings
    const orgSettings = (organization?.settings as Record<string, unknown>) || {};
    const brandName = (orgSettings.brandName as string) || organization?.name || "Y CRM";

    // Generate combined HTML
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invoices Export - ${invoices.length} Invoice${invoices.length > 1 ? 's' : ''}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      font-size: 14px;
      line-height: 1.5;
      color: #1f2937;
      background: white;
    }
    .invoice-page {
      max-width: 800px;
      margin: 0 auto;
      padding: 40px;
    }
    .page-break {
      page-break-after: always;
      border-bottom: 2px dashed #e5e7eb;
      margin-bottom: 40px;
      padding-bottom: 40px;
    }
    @media print {
      .page-break {
        border-bottom: none;
        margin-bottom: 0;
        padding-bottom: 0;
      }
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 40px;
      padding-bottom: 20px;
      border-bottom: 2px solid #e5e7eb;
    }
    .company-info h1 {
      font-size: 28px;
      font-weight: 700;
      color: #111827;
    }
    .invoice-title {
      text-align: right;
    }
    .invoice-title h2 {
      font-size: 32px;
      font-weight: 700;
      color: #6366f1;
      text-transform: uppercase;
      letter-spacing: 2px;
    }
    .invoice-number {
      font-size: 16px;
      color: #6b7280;
      margin-top: 4px;
    }
    .status-badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 9999px;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      margin-top: 8px;
    }
    .status-draft { background: #f3f4f6; color: #374151; }
    .status-sent { background: #dbeafe; color: #1d4ed8; }
    .status-paid { background: #dcfce7; color: #15803d; }
    .status-overdue { background: #fee2e2; color: #dc2626; }
    .status-partially_paid { background: #fef3c7; color: #b45309; }
    .status-void, .status-cancelled { background: #f3f4f6; color: #6b7280; }
    .addresses {
      display: flex;
      justify-content: space-between;
      margin-bottom: 40px;
    }
    .address-block {
      width: 45%;
    }
    .address-block h3 {
      font-size: 12px;
      text-transform: uppercase;
      color: #6b7280;
      margin-bottom: 8px;
      letter-spacing: 1px;
    }
    .address-block p {
      margin-bottom: 4px;
    }
    .address-block .name {
      font-weight: 600;
      font-size: 16px;
    }
    .details-table {
      text-align: right;
    }
    .details-table tr td {
      padding: 4px 0;
    }
    .details-table tr td:first-child {
      color: #6b7280;
      padding-right: 20px;
    }
    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 30px;
    }
    .items-table th {
      background: #f9fafb;
      padding: 12px;
      text-align: left;
      font-size: 12px;
      text-transform: uppercase;
      color: #6b7280;
      letter-spacing: 0.5px;
      border-bottom: 2px solid #e5e7eb;
    }
    .items-table th:last-child,
    .items-table td:last-child {
      text-align: right;
    }
    .items-table th:nth-child(2),
    .items-table th:nth-child(3),
    .items-table td:nth-child(2),
    .items-table td:nth-child(3) {
      text-align: center;
    }
    .items-table td {
      padding: 16px 12px;
      border-bottom: 1px solid #e5e7eb;
    }
    .item-description {
      font-weight: 500;
    }
    .item-code {
      font-size: 12px;
      color: #6b7280;
    }
    .totals {
      display: flex;
      justify-content: flex-end;
      margin-bottom: 40px;
    }
    .totals-table {
      width: 300px;
    }
    .totals-table tr td {
      padding: 8px 0;
    }
    .totals-table tr td:first-child {
      color: #6b7280;
    }
    .totals-table tr td:last-child {
      text-align: right;
      font-weight: 500;
    }
    .totals-table .total-row td {
      font-size: 18px;
      font-weight: 700;
      border-top: 2px solid #e5e7eb;
      padding-top: 12px;
    }
    .totals-table .discount td {
      color: #dc2626;
    }
    .totals-table .amount-due td {
      font-size: 20px;
      font-weight: 700;
      color: #dc2626;
    }
    .notes-terms {
      display: flex;
      gap: 40px;
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
    }
    .notes-terms > div {
      flex: 1;
    }
    .notes-terms h3 {
      font-size: 12px;
      text-transform: uppercase;
      color: #6b7280;
      margin-bottom: 8px;
      letter-spacing: 1px;
    }
    .notes-terms p {
      color: #4b5563;
      white-space: pre-wrap;
    }
    .footer {
      margin-top: 40px;
      text-align: center;
      color: #9ca3af;
      font-size: 12px;
    }
    @media print {
      body {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      .invoice-page {
        padding: 20px;
      }
    }
  </style>
</head>
<body>
  ${invoices.map((invoice, index) => 
    generateInvoiceHTML(invoice as unknown as InvoiceData, brandName, index === invoices.length - 1)
  ).join('')}
</body>
</html>
    `.trim();

    // Return HTML with appropriate filename
    const filename = invoices.length === 1 
      ? `invoice-${invoices[0].invoiceNumber}.html`
      : `invoices-export-${new Date().toISOString().split('T')[0]}.html`;

    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("[Bulk Export] Error:", error);
    
    if (error instanceof PermissionError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to export invoices" },
      { status: 500 }
    );
  }
}
