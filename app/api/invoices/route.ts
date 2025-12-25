/**
 * Invoices API
 * GET - List invoices with filters
 * POST - Create new invoice (with atomic inventory deduction)
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { getApiAuthContext } from "@/lib/auth";
import { requirePermission, PermissionError } from "@/lib/permissions";
import { createAuditLog } from "@/lib/audit";
import { revalidateInvoiceCaches } from "@/lib/cache-utils";
import prisma from "@/lib/db";
import { Prisma } from "@prisma/client";
import {
  createInvoiceSchema,
  invoiceFiltersSchema,
} from "@/lib/validation/invoices";
import {
  generateInvoiceNumber,
  calculateInvoiceTotals,
  calculateItemAmount,
} from "@/lib/invoices";
import {
  validateStockForInvoice,
  deductStockAtomic,
} from "@/lib/inventory/transactions";

/**
 * GET /api/invoices
 * List invoices with filters and pagination
 */
export async function GET(request: NextRequest) {
  try {
    const authContext = await getApiAuthContext();
    if (!authContext) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check permission
    await requirePermission(
      authContext.userId,
      authContext.orgId,
      "invoices",
      "view"
    );

    // Parse query params
    const searchParams = Object.fromEntries(request.nextUrl.searchParams);
    const filters = invoiceFiltersSchema.parse(searchParams);

    // Build where clause
    const where: Record<string, unknown> = {
      orgId: authContext.orgId,
    };

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.accountId) {
      where.accountId = filters.accountId;
    }

    if (filters.contactId) {
      where.contactId = filters.contactId;
    }

    if (filters.fromDate || filters.toDate) {
      where.issueDate = {};
      if (filters.fromDate) {
        (where.issueDate as Record<string, unknown>).gte = filters.fromDate;
      }
      if (filters.toDate) {
        (where.issueDate as Record<string, unknown>).lte = filters.toDate;
      }
    }

    if (filters.search) {
      where.OR = [
        { invoiceNumber: { contains: filters.search, mode: "insensitive" } },
        { account: { name: { contains: filters.search, mode: "insensitive" } } },
      ];
    }

    // Get total count
    const total = await prisma.invoice.count({ where });

    // Get invoices with pagination
    const invoices = await prisma.invoice.findMany({
      where,
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
        _count: {
          select: {
            items: true,
            payments: true,
          },
        },
      },
      orderBy: {
        [filters.sortBy]: filters.sortOrder,
      },
      skip: (filters.page - 1) * filters.limit,
      take: filters.limit,
    });

    return NextResponse.json({
      invoices,
      pagination: {
        page: filters.page,
        limit: filters.limit,
        total,
        totalPages: Math.ceil(total / filters.limit),
      },
    });
  } catch (error) {
    console.error("[Invoices GET] Error:", error);
    
    if (error instanceof PermissionError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }
    
    return NextResponse.json(
      { error: "Failed to fetch invoices" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/invoices
 * Create a new invoice with atomic inventory deduction
 *
 * ATOMIC TRANSACTION FLOW:
 * 1. Pre-validate stock availability (before transaction)
 * 2. Start transaction
 *    a. Create Invoice with InvoiceItems
 *    b. Deduct stock from InventoryItems
 *    c. Create StockMovement records
 * 3. If any step fails, entire transaction is rolled back
 */
export async function POST(request: NextRequest) {
  try {
    const authContext = await getApiAuthContext();
    if (!authContext) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check permission
    await requirePermission(
      authContext.userId,
      authContext.orgId,
      "invoices",
      "create"
    );

    const body = await request.json();
    const data = createInvoiceSchema.parse(body);

    // Verify account exists and belongs to org
    const account = await prisma.account.findFirst({
      where: {
        id: data.accountId,
        orgId: authContext.orgId,
      },
      include: {
        contacts: {
          where: { isPrimary: true },
          take: 1,
        },
      },
    });

    if (!account) {
      return NextResponse.json(
        { error: "Account not found" },
        { status: 404 }
      );
    }

    // STEP 1: Pre-validate stock availability for inventory-linked items
    const inventoryItems = data.items.filter(
      (item) => item.inventoryItemId && item.deductFromStock !== false
    );

    if (inventoryItems.length > 0) {
      const stockValidation = await validateStockForInvoice(
        authContext.orgId,
        inventoryItems.map((item) => ({
          inventoryItemId: item.inventoryItemId,
          quantity: item.quantity,
        }))
      );

      if (!stockValidation.valid) {
        return NextResponse.json(
          {
            error: "Insufficient stock",
            details: stockValidation.errors,
          },
          { status: 400 }
        );
      }
    }

    // Generate invoice number before transaction
    const invoiceNumber = await generateInvoiceNumber(authContext.orgId);

    // STEP 2: Execute atomic transaction
    const result = await prisma.$transaction(async (tx) => {
      // Calculate item amounts and prepare for creation
      const itemsWithAmounts = data.items.map((item, index) => ({
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        amount: calculateItemAmount(item.quantity, item.unitPrice),
        itemCode: item.itemCode,
        sortOrder: item.sortOrder ?? index,
        inventoryItemId: item.inventoryItemId || null,
        priceAtSale: item.inventoryItemId ? item.unitPrice : null,
      }));

      // Calculate totals
      const totals = calculateInvoiceTotals(
        itemsWithAmounts,
        data.taxRate,
        data.discountType,
        data.discountValue
      );

      // Prepare billing address
      const billingAddress = data.billingAddress || {
        name: account.name,
        ...(account.address as Record<string, unknown> || {}),
      };

      // STEP 2a: Create invoice with items
      const invoice = await tx.invoice.create({
        data: {
          orgId: authContext.orgId,
          invoiceNumber,
          status: data.status || "DRAFT",
          accountId: data.accountId,
          contactId: data.contactId || account.contacts[0]?.id,
          opportunityId: data.opportunityId,
          issueDate: data.issueDate || new Date(),
          dueDate: data.dueDate,
          currency: data.currency || "USD",
          taxRate: data.taxRate,
          discountType: data.discountType,
          discountValue: data.discountValue,
          subtotal: totals.subtotal,
          taxAmount: totals.taxAmount,
          discountAmount: totals.discountAmount,
          total: totals.total,
          amountPaid: 0,
          amountDue: totals.total,
          notes: data.notes,
          terms: data.terms,
          footer: data.footer,
          billingAddress: billingAddress as Prisma.InputJsonValue,
          customFields: (data.customFields || {}) as Prisma.InputJsonValue,
          createdById: authContext.userId,
          createdByType: "USER",
          items: {
            create: itemsWithAmounts,
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

      // STEP 2b & 2c: Deduct stock atomically for inventory-linked items
      const itemsToDeduct = data.items
        .filter((item) => item.inventoryItemId && item.deductFromStock !== false)
        .map((item) => ({
          inventoryItemId: item.inventoryItemId!,
          quantity: Math.floor(item.quantity), // Stock levels are integers
        }));

      if (itemsToDeduct.length > 0) {
        const deductionResult = await deductStockAtomic(
          tx,
          authContext.orgId,
          itemsToDeduct,
          invoice.id,
          authContext.userId,
          "USER"
        );

        if (!deductionResult.success) {
          // This will cause the transaction to roll back
          throw new Error(deductionResult.error || "Stock deduction failed");
        }
      }

      return invoice;
    });

    // STEP 3: Post-transaction actions (outside transaction)
    await createAuditLog({
      orgId: authContext.orgId,
      action: "CREATE",
      module: "INVOICE",
      recordId: result.id,
      actorType: "USER",
      actorId: authContext.userId,
      newState: result,
      metadata: {
        inventoryItemsDeducted: inventoryItems.length,
      },
    });

    revalidateInvoiceCaches();

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("[Invoices POST] Error:", error);

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

    // Handle stock-related errors
    if (error instanceof Error && error.message.includes("Insufficient stock")) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to create invoice" },
      { status: 500 }
    );
  }
}
