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
  checkRecordAccess,
} from "@/lib/api-permissions";

interface RouteParams {
  params: Promise<{ id: string }>;
}

const updateEmployeeSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional().nullable(),
  dateOfBirth: z.string().datetime().optional().nullable(),
  address: z.object({
    street: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    zip: z.string().optional(),
    country: z.string().optional(),
  }).optional().nullable(),
  employeeId: z.string().min(1).optional(),
  department: z.string().optional().nullable(),
  position: z.string().optional().nullable(),
  employmentType: z.enum(["FULL_TIME", "PART_TIME", "CONTRACT", "INTERN"]).optional(),
  status: z.enum(["ACTIVE", "ON_LEAVE", "TERMINATED", "RESIGNED"]).optional(),
  joinDate: z.string().datetime().optional(),
  terminationDate: z.string().datetime().optional().nullable(),
  salary: z.number().optional().nullable(),
  salaryType: z.enum(["HOURLY", "WEEKLY", "BIWEEKLY", "MONTHLY", "ANNUAL"]).optional(),
  currency: z.string().optional(),
  managerId: z.string().optional().nullable(),
  assignedToId: z.string().optional().nullable(),
  customFields: z.record(z.unknown()).optional(),
  documents: z.array(z.object({
    name: z.string(),
    url: z.string(),
    type: z.string().optional(),
    uploadedAt: z.string().optional(),
  })).optional(),
});

// GET /api/employees/[id] - Get a single employee
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await getApiAuthContext();
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get permission context
    const permCtx = await getRoutePermissionContext(auth.userId, auth.orgId, "employees", "view");
    if (!permCtx.allowed) {
      return NextResponse.json({ error: "You don't have permission to view employees" }, { status: 403 });
    }

    const { id } = await params;

    const employee = await prisma.employee.findFirst({
      where: {
        id,
        orgId: auth.orgId,
      },
      include: {
        leaves: {
          orderBy: { startDate: "desc" },
          take: 10,
        },
        payrolls: {
          orderBy: { payPeriod: "desc" },
          take: 12,
        },
        tasks: {
          orderBy: { dueDate: "asc" },
          where: {
            status: { in: ["PENDING", "IN_PROGRESS"] },
          },
          take: 5,
        },
        notes: {
          orderBy: { createdAt: "desc" },
          take: 10,
        },
        _count: {
          select: {
            leaves: true,
            payrolls: true,
            tasks: true,
            notes: true,
          },
        },
      },
    });

    if (!employee) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }

    // Check record-level access
    const accessError = checkRecordAccess(permCtx.recordVisibility, auth.userId, employee.assignedToId);
    if (accessError) return accessError;

    // Apply field-level filtering
    const filteredEmployee = filterToAllowedFields(
      employee as unknown as Record<string, unknown>,
      permCtx.allowedViewFields
    );

    return NextResponse.json(filteredEmployee);
  } catch (error) {
    console.error("Error fetching employee:", error);
    return NextResponse.json(
      { error: "Failed to fetch employee" },
      { status: 500 }
    );
  }
}

// PUT /api/employees/[id] - Update an employee
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await getApiAuthContext();
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get permission context
    const permCtx = await getRoutePermissionContext(auth.userId, auth.orgId, "employees", "edit");
    if (!permCtx.allowed) {
      return NextResponse.json({ error: "You don't have permission to edit employees" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();

    // Get existing employee first
    const existingEmployee = await prisma.employee.findFirst({
      where: {
        id,
        orgId: auth.orgId,
      },
    });

    if (!existingEmployee) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }

    // Check record-level access
    const accessError = checkRecordAccess(permCtx.recordVisibility, auth.userId, existingEmployee.assignedToId);
    if (accessError) return accessError;

    // Validate update data
    const validationResult = updateEmployeeSchema.safeParse(body);
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
      ["customFields", "documents"]
    );
    if (!fieldValidation.valid) {
      return NextResponse.json(
        { error: `You don't have permission to edit these fields: ${fieldValidation.disallowedFields.join(", ")}` },
        { status: 403 }
      );
    }

    // Check for duplicate email (if email is being changed)
    if (data.email && data.email !== existingEmployee.email) {
      const duplicate = await prisma.employee.findFirst({
        where: {
          orgId: auth.orgId,
          email: data.email,
          id: { not: id },
        },
      });
      if (duplicate) {
        return NextResponse.json(
          { error: "An employee with this email already exists" },
          { status: 409 }
        );
      }
    }

    // Check for duplicate employee ID (if changing)
    if (data.employeeId && data.employeeId !== existingEmployee.employeeId) {
      const duplicate = await prisma.employee.findFirst({
        where: {
          orgId: auth.orgId,
          employeeId: data.employeeId,
          id: { not: id },
        },
      });
      if (duplicate) {
        return NextResponse.json(
          { error: "An employee with this employee ID already exists" },
          { status: 409 }
        );
      }
    }

    // Build update data
    const updateData: Prisma.EmployeeUpdateInput = {};

    if (data.firstName !== undefined) updateData.firstName = data.firstName;
    if (data.lastName !== undefined) updateData.lastName = data.lastName;
    if (data.email !== undefined) updateData.email = data.email;
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.dateOfBirth !== undefined) updateData.dateOfBirth = data.dateOfBirth ? new Date(data.dateOfBirth) : null;
    if (data.address !== undefined) updateData.address = data.address ? (data.address as Prisma.InputJsonValue) : Prisma.JsonNull;
    if (data.employeeId !== undefined) updateData.employeeId = data.employeeId;
    if (data.department !== undefined) updateData.department = data.department;
    if (data.position !== undefined) updateData.position = data.position;
    if (data.employmentType !== undefined) updateData.employmentType = data.employmentType;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.joinDate !== undefined) updateData.joinDate = new Date(data.joinDate);
    if (data.terminationDate !== undefined) updateData.terminationDate = data.terminationDate ? new Date(data.terminationDate) : null;
    if (data.salary !== undefined) updateData.salary = data.salary !== null ? new Prisma.Decimal(data.salary) : null;
    if (data.salaryType !== undefined) updateData.salaryType = data.salaryType;
    if (data.currency !== undefined) updateData.currency = data.currency;
    if (data.managerId !== undefined) updateData.managerId = data.managerId;
    if (data.assignedToId !== undefined) updateData.assignedToId = data.assignedToId;

    // Handle customFields merge
    if (data.customFields) {
      updateData.customFields = {
        ...(existingEmployee.customFields as object),
        ...data.customFields,
      } as Prisma.InputJsonValue;
    }

    // Handle documents merge
    if (data.documents) {
      updateData.documents = data.documents as Prisma.InputJsonValue;
    }

    // Update employee
    const updatedEmployee = await prisma.employee.update({
      where: { id },
      data: updateData,
    });

    // Audit log
    await createAuditLog({
      orgId: auth.orgId,
      action: "UPDATE",
      module: "EMPLOYEE",
      recordId: id,
      actorType: "USER",
      actorId: auth.userId,
      previousState: existingEmployee as unknown as Record<string, unknown>,
      newState: updatedEmployee as unknown as Record<string, unknown>,
    });

    return NextResponse.json(updatedEmployee);
  } catch (error) {
    console.error("Error updating employee:", error);
    return NextResponse.json(
      { error: "Failed to update employee" },
      { status: 500 }
    );
  }
}

// DELETE /api/employees/[id] - Delete an employee
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await getApiAuthContext();
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get permission context
    const permCtx = await getRoutePermissionContext(auth.userId, auth.orgId, "employees", "delete");
    if (!permCtx.allowed) {
      return NextResponse.json({ error: "You don't have permission to delete employees" }, { status: 403 });
    }

    const { id } = await params;

    // Get existing employee
    const existingEmployee = await prisma.employee.findFirst({
      where: {
        id,
        orgId: auth.orgId,
      },
    });

    if (!existingEmployee) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }

    // Check record-level access
    const accessError = checkRecordAccess(permCtx.recordVisibility, auth.userId, existingEmployee.assignedToId);
    if (accessError) return accessError;

    // Delete employee (cascade will handle related records)
    await prisma.employee.delete({
      where: { id },
    });

    // Audit log
    await createAuditLog({
      orgId: auth.orgId,
      action: "DELETE",
      module: "EMPLOYEE",
      recordId: id,
      actorType: "USER",
      actorId: auth.userId,
      previousState: existingEmployee as unknown as Record<string, unknown>,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting employee:", error);
    return NextResponse.json(
      { error: "Failed to delete employee" },
      { status: 500 }
    );
  }
}
