import { NextRequest, NextResponse } from "next/server";
import { getApiAuthContext } from "@/lib/auth";
import prisma from "@/lib/db";
import { Prisma } from "@prisma/client";
import { createAuditLog } from "@/lib/audit";
import { z } from "zod";
import {
  getRoutePermissionContext,
  filterArrayToAllowedFields,
  validateEditFields,
} from "@/lib/api-permissions";

// Validation schemas
const createPayrollSchema = z.object({
  employeeId: z.string().min(1, "Employee ID is required"),
  payPeriod: z.string().min(1, "Pay period is required"), // e.g., "2024-01"
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  baseSalary: z.number().min(0),
  overtime: z.number().min(0).default(0),
  bonus: z.number().min(0).default(0),
  commission: z.number().min(0).default(0),
  allowances: z.number().min(0).default(0),
  taxDeduction: z.number().min(0).default(0),
  insuranceDeduction: z.number().min(0).default(0),
  retirementDeduction: z.number().min(0).default(0),
  otherDeductions: z.number().min(0).default(0),
  currency: z.string().default("USD"),
  paymentMethod: z.enum(["BANK_TRANSFER", "CHECK", "CASH"]).optional(),
  bankDetails: z.object({
    bankName: z.string().optional(),
    accountNumber: z.string().optional(),
    routingNumber: z.string().optional(),
  }).optional(),
  notes: z.string().optional(),
  customFields: z.record(z.unknown()).optional(),
});

const payrollFilterSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  sortBy: z.enum(["createdAt", "payPeriod", "paymentDate", "netPay"]).default("payPeriod"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
  status: z.enum(["DRAFT", "PENDING", "APPROVED", "PROCESSED", "PAID"]).optional(),
  employeeId: z.string().optional(),
  payPeriod: z.string().optional(),
});

// GET /api/payroll - List payroll records with filtering and pagination
export async function GET(request: NextRequest) {
  try {
    const auth = await getApiAuthContext();
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get permission context
    const permCtx = await getRoutePermissionContext(auth.userId, auth.orgId, "payroll", "view");
    if (!permCtx.allowed) {
      return NextResponse.json({ error: "You don't have permission to view payroll" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const params = Object.fromEntries(searchParams.entries());

    // Validate filter params
    const filterResult = payrollFilterSchema.safeParse(params);
    if (!filterResult.success) {
      return NextResponse.json(
        { error: "Invalid parameters", details: filterResult.error.format() },
        { status: 400 }
      );
    }

    const {
      page,
      limit,
      sortBy,
      sortOrder,
      status,
      employeeId,
      payPeriod,
    } = filterResult.data;

    // Build where clause
    const where: Record<string, unknown> = {
      orgId: auth.orgId,
    };

    if (status) where.status = status;
    if (employeeId) where.employeeId = employeeId;
    if (payPeriod) where.payPeriod = payPeriod;

    // Execute query
    const [payrolls, total] = await Promise.all([
      prisma.payroll.findMany({
        where: where as Prisma.PayrollWhereInput,
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          employee: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              employeeId: true,
              department: true,
              position: true,
            },
          },
        },
      }),
      prisma.payroll.count({ where: where as Prisma.PayrollWhereInput }),
    ]);

    // Apply field-level filtering
    const filteredPayrolls = filterArrayToAllowedFields(
      payrolls as unknown as Record<string, unknown>[],
      permCtx.allowedViewFields
    );

    return NextResponse.json({
      data: filteredPayrolls,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Error fetching payroll:", error);
    return NextResponse.json(
      { error: "Failed to fetch payroll records" },
      { status: 500 }
    );
  }
}

// POST /api/payroll - Create a new payroll record
export async function POST(request: NextRequest) {
  try {
    const auth = await getApiAuthContext();
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get permission context
    const permCtx = await getRoutePermissionContext(auth.userId, auth.orgId, "payroll", "create");
    if (!permCtx.allowed) {
      return NextResponse.json({ error: "You don't have permission to create payroll records" }, { status: 403 });
    }

    const body = await request.json();

    // Validate base schema
    const validationResult = createPayrollSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validationResult.error.format() },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    // Validate field-level edit permissions
    const fieldValidation = validateEditFields(
      data as Record<string, unknown>,
      permCtx.allowedEditFields,
      ["customFields", "bankDetails"]
    );
    if (!fieldValidation.valid) {
      return NextResponse.json(
        { error: `You don't have permission to set these fields: ${fieldValidation.disallowedFields.join(", ")}` },
        { status: 403 }
      );
    }

    // Verify employee exists
    const employee = await prisma.employee.findFirst({
      where: {
        id: data.employeeId,
        orgId: auth.orgId,
      },
    });
    if (!employee) {
      return NextResponse.json(
        { error: "Employee not found" },
        { status: 404 }
      );
    }

    // Check for duplicate payroll for same period
    const existing = await prisma.payroll.findFirst({
      where: {
        orgId: auth.orgId,
        employeeId: data.employeeId,
        payPeriod: data.payPeriod,
      },
    });
    if (existing) {
      return NextResponse.json(
        { error: "A payroll record already exists for this employee and pay period" },
        { status: 409 }
      );
    }

    // Calculate totals
    const grossPay = data.baseSalary + data.overtime + data.bonus + data.commission + data.allowances;
    const totalDeductions = data.taxDeduction + data.insuranceDeduction + data.retirementDeduction + data.otherDeductions;
    const netPay = grossPay - totalDeductions;

    // Create payroll
    const payroll = await prisma.payroll.create({
      data: {
        orgId: auth.orgId,
        employeeId: data.employeeId,
        payPeriod: data.payPeriod,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        baseSalary: new Prisma.Decimal(data.baseSalary),
        overtime: new Prisma.Decimal(data.overtime),
        bonus: new Prisma.Decimal(data.bonus),
        commission: new Prisma.Decimal(data.commission),
        allowances: new Prisma.Decimal(data.allowances),
        grossPay: new Prisma.Decimal(grossPay),
        taxDeduction: new Prisma.Decimal(data.taxDeduction),
        insuranceDeduction: new Prisma.Decimal(data.insuranceDeduction),
        retirementDeduction: new Prisma.Decimal(data.retirementDeduction),
        otherDeductions: new Prisma.Decimal(data.otherDeductions),
        totalDeductions: new Prisma.Decimal(totalDeductions),
        netPay: new Prisma.Decimal(netPay),
        currency: data.currency,
        status: "DRAFT",
        paymentMethod: data.paymentMethod,
        bankDetails: data.bankDetails ? (data.bankDetails as Prisma.InputJsonValue) : Prisma.JsonNull,
        notes: data.notes,
        customFields: data.customFields ? (data.customFields as Prisma.InputJsonValue) : {},
        createdById: auth.userId,
        createdByType: "USER",
      },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeId: true,
          },
        },
      },
    });

    // Audit log
    await createAuditLog({
      orgId: auth.orgId,
      action: "CREATE",
      module: "PAYROLL",
      recordId: payroll.id,
      actorType: "USER",
      actorId: auth.userId,
      newState: payroll as unknown as Record<string, unknown>,
    });

    return NextResponse.json(payroll, { status: 201 });
  } catch (error) {
    console.error("Error creating payroll:", error);
    return NextResponse.json(
      { error: "Failed to create payroll record" },
      { status: 500 }
    );
  }
}
