import { NextRequest, NextResponse } from "next/server";
import { getApiAuthContext } from "@/lib/auth";
import prisma from "@/lib/db";
import { Prisma } from "@prisma/client";
import { createAuditLog } from "@/lib/audit";
import { z } from "zod";
import {
  getRoutePermissionContext,
  filterToAllowedFields,
  validateEditFields,
} from "@/lib/api-permissions";

interface RouteParams {
  params: Promise<{ id: string }>;
}

const updatePayrollSchema = z.object({
  baseSalary: z.number().min(0).optional(),
  overtime: z.number().min(0).optional(),
  bonus: z.number().min(0).optional(),
  commission: z.number().min(0).optional(),
  allowances: z.number().min(0).optional(),
  taxDeduction: z.number().min(0).optional(),
  insuranceDeduction: z.number().min(0).optional(),
  retirementDeduction: z.number().min(0).optional(),
  otherDeductions: z.number().min(0).optional(),
  status: z.enum(["DRAFT", "PENDING", "APPROVED", "PROCESSED", "PAID"]).optional(),
  paymentDate: z.string().datetime().optional().nullable(),
  paymentMethod: z.enum(["BANK_TRANSFER", "CHECK", "CASH"]).optional().nullable(),
  bankDetails: z.object({
    bankName: z.string().optional(),
    accountNumber: z.string().optional(),
    routingNumber: z.string().optional(),
  }).optional().nullable(),
  notes: z.string().optional().nullable(),
  customFields: z.record(z.unknown()).optional(),
});

// GET /api/payroll/[id] - Get a single payroll record
export async function GET(request: NextRequest, { params }: RouteParams) {
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

    const { id } = await params;

    const payroll = await prisma.payroll.findFirst({
      where: {
        id,
        orgId: auth.orgId,
      },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            employeeId: true,
            department: true,
            position: true,
            salary: true,
            salaryType: true,
          },
        },
      },
    });

    if (!payroll) {
      return NextResponse.json({ error: "Payroll record not found" }, { status: 404 });
    }

    // Apply field-level filtering
    const filteredPayroll = filterToAllowedFields(
      payroll as unknown as Record<string, unknown>,
      permCtx.allowedViewFields
    );

    return NextResponse.json(filteredPayroll);
  } catch (error) {
    console.error("Error fetching payroll:", error);
    return NextResponse.json(
      { error: "Failed to fetch payroll record" },
      { status: 500 }
    );
  }
}

// PUT /api/payroll/[id] - Update a payroll record
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await getApiAuthContext();
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get permission context
    const permCtx = await getRoutePermissionContext(auth.userId, auth.orgId, "payroll", "edit");
    if (!permCtx.allowed) {
      return NextResponse.json({ error: "You don't have permission to edit payroll" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();

    // Get existing payroll first
    const existingPayroll = await prisma.payroll.findFirst({
      where: {
        id,
        orgId: auth.orgId,
      },
    });

    if (!existingPayroll) {
      return NextResponse.json({ error: "Payroll record not found" }, { status: 404 });
    }

    // Check if payroll can be edited (not PAID)
    if (existingPayroll.status === "PAID") {
      return NextResponse.json(
        { error: "Cannot edit a payroll that has already been paid" },
        { status: 400 }
      );
    }

    // Validate update data
    const validationResult = updatePayrollSchema.safeParse(body);
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
        { error: `You don't have permission to edit these fields: ${fieldValidation.disallowedFields.join(", ")}` },
        { status: 403 }
      );
    }

    // Build update data
    const updateData: Prisma.PayrollUpdateInput = {};

    // Track if any monetary fields are changing for recalculation
    const needsRecalculation = [
      'baseSalary', 'overtime', 'bonus', 'commission', 'allowances',
      'taxDeduction', 'insuranceDeduction', 'retirementDeduction', 'otherDeductions'
    ].some(field => data[field as keyof typeof data] !== undefined);

    if (data.baseSalary !== undefined) updateData.baseSalary = new Prisma.Decimal(data.baseSalary);
    if (data.overtime !== undefined) updateData.overtime = new Prisma.Decimal(data.overtime);
    if (data.bonus !== undefined) updateData.bonus = new Prisma.Decimal(data.bonus);
    if (data.commission !== undefined) updateData.commission = new Prisma.Decimal(data.commission);
    if (data.allowances !== undefined) updateData.allowances = new Prisma.Decimal(data.allowances);
    if (data.taxDeduction !== undefined) updateData.taxDeduction = new Prisma.Decimal(data.taxDeduction);
    if (data.insuranceDeduction !== undefined) updateData.insuranceDeduction = new Prisma.Decimal(data.insuranceDeduction);
    if (data.retirementDeduction !== undefined) updateData.retirementDeduction = new Prisma.Decimal(data.retirementDeduction);
    if (data.otherDeductions !== undefined) updateData.otherDeductions = new Prisma.Decimal(data.otherDeductions);

    // Recalculate totals if monetary fields changed
    if (needsRecalculation) {
      const baseSalary = data.baseSalary ?? Number(existingPayroll.baseSalary);
      const overtime = data.overtime ?? Number(existingPayroll.overtime);
      const bonus = data.bonus ?? Number(existingPayroll.bonus);
      const commission = data.commission ?? Number(existingPayroll.commission);
      const allowances = data.allowances ?? Number(existingPayroll.allowances);
      const taxDeduction = data.taxDeduction ?? Number(existingPayroll.taxDeduction);
      const insuranceDeduction = data.insuranceDeduction ?? Number(existingPayroll.insuranceDeduction);
      const retirementDeduction = data.retirementDeduction ?? Number(existingPayroll.retirementDeduction);
      const otherDeductions = data.otherDeductions ?? Number(existingPayroll.otherDeductions);

      const grossPay = baseSalary + overtime + bonus + commission + allowances;
      const totalDeductions = taxDeduction + insuranceDeduction + retirementDeduction + otherDeductions;
      const netPay = grossPay - totalDeductions;

      updateData.grossPay = new Prisma.Decimal(grossPay);
      updateData.totalDeductions = new Prisma.Decimal(totalDeductions);
      updateData.netPay = new Prisma.Decimal(netPay);
    }

    if (data.status !== undefined) {
      updateData.status = data.status;
      if (data.status === "APPROVED") {
        updateData.approvedById = auth.userId;
        updateData.approvedAt = new Date();
      }
      if (data.status === "PAID" && data.paymentDate) {
        updateData.paymentDate = new Date(data.paymentDate);
      }
    }
    if (data.paymentDate !== undefined) updateData.paymentDate = data.paymentDate ? new Date(data.paymentDate) : null;
    if (data.paymentMethod !== undefined) updateData.paymentMethod = data.paymentMethod;
    if (data.bankDetails !== undefined) updateData.bankDetails = data.bankDetails as Prisma.InputJsonValue;
    if (data.notes !== undefined) updateData.notes = data.notes;

    // Handle customFields merge
    if (data.customFields) {
      updateData.customFields = {
        ...(existingPayroll.customFields as object),
        ...data.customFields,
      } as Prisma.InputJsonValue;
    }

    // Update payroll
    const updatedPayroll = await prisma.payroll.update({
      where: { id },
      data: updateData,
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
      action: "UPDATE",
      module: "PAYROLL",
      recordId: id,
      actorType: "USER",
      actorId: auth.userId,
      previousState: existingPayroll as unknown as Record<string, unknown>,
      newState: updatedPayroll as unknown as Record<string, unknown>,
    });

    return NextResponse.json(updatedPayroll);
  } catch (error) {
    console.error("Error updating payroll:", error);
    return NextResponse.json(
      { error: "Failed to update payroll record" },
      { status: 500 }
    );
  }
}

// DELETE /api/payroll/[id] - Delete a payroll record
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await getApiAuthContext();
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get permission context
    const permCtx = await getRoutePermissionContext(auth.userId, auth.orgId, "payroll", "delete");
    if (!permCtx.allowed) {
      return NextResponse.json({ error: "You don't have permission to delete payroll records" }, { status: 403 });
    }

    const { id } = await params;

    // Get existing payroll
    const existingPayroll = await prisma.payroll.findFirst({
      where: {
        id,
        orgId: auth.orgId,
      },
    });

    if (!existingPayroll) {
      return NextResponse.json({ error: "Payroll record not found" }, { status: 404 });
    }

    // Check if payroll can be deleted (only DRAFT)
    if (existingPayroll.status !== "DRAFT") {
      return NextResponse.json(
        { error: "Only draft payroll records can be deleted" },
        { status: 400 }
      );
    }

    // Delete payroll
    await prisma.payroll.delete({
      where: { id },
    });

    // Audit log
    await createAuditLog({
      orgId: auth.orgId,
      action: "DELETE",
      module: "PAYROLL",
      recordId: id,
      actorType: "USER",
      actorId: auth.userId,
      previousState: existingPayroll as unknown as Record<string, unknown>,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting payroll:", error);
    return NextResponse.json(
      { error: "Failed to delete payroll record" },
      { status: 500 }
    );
  }
}
