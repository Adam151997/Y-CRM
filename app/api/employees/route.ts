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
const createEmployeeSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional(),
  dateOfBirth: z.string().datetime().optional(),
  address: z.object({
    street: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    zip: z.string().optional(),
    country: z.string().optional(),
  }).optional(),
  employeeId: z.string().min(1, "Employee ID is required"),
  department: z.string().optional(),
  position: z.string().optional(),
  employmentType: z.enum(["FULL_TIME", "PART_TIME", "CONTRACT", "INTERN"]).default("FULL_TIME"),
  status: z.enum(["ACTIVE", "ON_LEAVE", "TERMINATED", "RESIGNED"]).default("ACTIVE"),
  joinDate: z.string().datetime(),
  salary: z.number().optional(),
  salaryType: z.enum(["HOURLY", "WEEKLY", "BIWEEKLY", "MONTHLY", "ANNUAL"]).default("MONTHLY"),
  currency: z.string().default("USD"),
  managerId: z.string().optional(),
  assignedToId: z.string().optional(),
  customFields: z.record(z.unknown()).optional(),
});

const employeeFilterSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  sortBy: z.enum(["createdAt", "firstName", "lastName", "joinDate", "department"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
  query: z.string().optional(),
  status: z.enum(["ACTIVE", "ON_LEAVE", "TERMINATED", "RESIGNED"]).optional(),
  department: z.string().optional(),
  employmentType: z.enum(["FULL_TIME", "PART_TIME", "CONTRACT", "INTERN"]).optional(),
  assignedToId: z.string().optional(),
});

// GET /api/employees - List employees with filtering and pagination
export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const params = Object.fromEntries(searchParams.entries());

    // Validate filter params
    const filterResult = employeeFilterSchema.safeParse(params);
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
      query,
      status,
      department,
      employmentType,
      assignedToId,
    } = filterResult.data;

    // Build where clause with record visibility filter
    const where: Record<string, unknown> = {
      orgId: auth.orgId,
      ...permCtx.visibilityFilter,
    };

    if (status) where.status = status;
    if (department) where.department = department;
    if (employmentType) where.employmentType = employmentType;
    if (assignedToId) where.assignedToId = assignedToId;

    if (query) {
      where.OR = [
        { firstName: { contains: query, mode: "insensitive" } },
        { lastName: { contains: query, mode: "insensitive" } },
        { email: { contains: query, mode: "insensitive" } },
        { employeeId: { contains: query, mode: "insensitive" } },
        { department: { contains: query, mode: "insensitive" } },
        { position: { contains: query, mode: "insensitive" } },
      ];
    }

    // Execute query
    const [employees, total] = await Promise.all([
      prisma.employee.findMany({
        where: where as Prisma.EmployeeWhereInput,
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          _count: {
            select: {
              leaves: true,
              payrolls: true,
              tasks: true,
              notes: true,
            },
          },
        },
      }),
      prisma.employee.count({ where: where as Prisma.EmployeeWhereInput }),
    ]);

    // Apply field-level filtering
    const filteredEmployees = filterArrayToAllowedFields(
      employees as unknown as Record<string, unknown>[],
      permCtx.allowedViewFields
    );

    return NextResponse.json({
      data: filteredEmployees,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Error fetching employees:", error);
    return NextResponse.json(
      { error: "Failed to fetch employees" },
      { status: 500 }
    );
  }
}

// POST /api/employees - Create a new employee
export async function POST(request: NextRequest) {
  try {
    const auth = await getApiAuthContext();
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get permission context
    const permCtx = await getRoutePermissionContext(auth.userId, auth.orgId, "employees", "create");
    if (!permCtx.allowed) {
      return NextResponse.json({ error: "You don't have permission to create employees" }, { status: 403 });
    }

    const body = await request.json();

    // Validate base schema
    const validationResult = createEmployeeSchema.safeParse(body);
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
      ["customFields"]
    );
    if (!fieldValidation.valid) {
      return NextResponse.json(
        { error: `You don't have permission to set these fields: ${fieldValidation.disallowedFields.join(", ")}` },
        { status: 403 }
      );
    }

    // Check for duplicate email
    const existingEmail = await prisma.employee.findFirst({
      where: {
        orgId: auth.orgId,
        email: data.email,
      },
    });
    if (existingEmail) {
      return NextResponse.json(
        { error: "An employee with this email already exists" },
        { status: 409 }
      );
    }

    // Check for duplicate employee ID
    const existingEmployeeId = await prisma.employee.findFirst({
      where: {
        orgId: auth.orgId,
        employeeId: data.employeeId,
      },
    });
    if (existingEmployeeId) {
      return NextResponse.json(
        { error: "An employee with this employee ID already exists" },
        { status: 409 }
      );
    }

    // Create employee
    const employee = await prisma.employee.create({
      data: {
        orgId: auth.orgId,
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone,
        dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
        address: data.address ? (data.address as Prisma.InputJsonValue) : Prisma.JsonNull,
        employeeId: data.employeeId,
        department: data.department,
        position: data.position,
        employmentType: data.employmentType,
        status: data.status,
        joinDate: new Date(data.joinDate),
        salary: data.salary ? new Prisma.Decimal(data.salary) : null,
        salaryType: data.salaryType,
        currency: data.currency,
        managerId: data.managerId,
        assignedToId: data.assignedToId || auth.userId,
        customFields: data.customFields ? (data.customFields as Prisma.InputJsonValue) : {},
        createdById: auth.userId,
        createdByType: "USER",
      },
    });

    // Audit log
    await createAuditLog({
      orgId: auth.orgId,
      action: "CREATE",
      module: "EMPLOYEE",
      recordId: employee.id,
      actorType: "USER",
      actorId: auth.userId,
      newState: employee as unknown as Record<string, unknown>,
    });

    return NextResponse.json(employee, { status: 201 });
  } catch (error) {
    console.error("Error creating employee:", error);
    return NextResponse.json(
      { error: "Failed to create employee" },
      { status: 500 }
    );
  }
}
