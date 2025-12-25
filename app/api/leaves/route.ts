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
const createLeaveSchema = z.object({
  employeeId: z.string().min(1, "Employee ID is required"),
  type: z.enum(["ANNUAL", "SICK", "UNPAID", "MATERNITY", "PATERNITY", "EMERGENCY", "BEREAVEMENT", "OTHER"]),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  days: z.number().positive("Days must be positive"),
  reason: z.string().optional(),
  customFields: z.record(z.unknown()).optional(),
});

const leaveFilterSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  sortBy: z.enum(["createdAt", "startDate", "endDate", "days"]).default("startDate"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
  status: z.enum(["PENDING", "APPROVED", "REJECTED", "CANCELLED"]).optional(),
  type: z.enum(["ANNUAL", "SICK", "UNPAID", "MATERNITY", "PATERNITY", "EMERGENCY", "BEREAVEMENT", "OTHER"]).optional(),
  employeeId: z.string().optional(),
  startAfter: z.string().datetime().optional(),
  startBefore: z.string().datetime().optional(),
});

// GET /api/leaves - List leaves with filtering and pagination
export async function GET(request: NextRequest) {
  try {
    const auth = await getApiAuthContext();
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get permission context
    const permCtx = await getRoutePermissionContext(auth.userId, auth.orgId, "leaves", "view");
    if (!permCtx.allowed) {
      return NextResponse.json({ error: "You don't have permission to view leaves" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const params = Object.fromEntries(searchParams.entries());

    // Validate filter params
    const filterResult = leaveFilterSchema.safeParse(params);
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
      type,
      employeeId,
      startAfter,
      startBefore,
    } = filterResult.data;

    // Build where clause
    const where: Record<string, unknown> = {
      orgId: auth.orgId,
    };

    if (status) where.status = status;
    if (type) where.type = type;
    if (employeeId) where.employeeId = employeeId;

    if (startAfter || startBefore) {
      where.startDate = {};
      if (startAfter) (where.startDate as Record<string, Date>).gte = new Date(startAfter);
      if (startBefore) (where.startDate as Record<string, Date>).lte = new Date(startBefore);
    }

    // Execute query
    const [leaves, total] = await Promise.all([
      prisma.leave.findMany({
        where: where as Prisma.LeaveWhereInput,
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
      prisma.leave.count({ where: where as Prisma.LeaveWhereInput }),
    ]);

    // Apply field-level filtering
    const filteredLeaves = filterArrayToAllowedFields(
      leaves as unknown as Record<string, unknown>[],
      permCtx.allowedViewFields
    );

    return NextResponse.json({
      data: filteredLeaves,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Error fetching leaves:", error);
    return NextResponse.json(
      { error: "Failed to fetch leaves" },
      { status: 500 }
    );
  }
}

// POST /api/leaves - Create a new leave request
export async function POST(request: NextRequest) {
  try {
    const auth = await getApiAuthContext();
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get permission context
    const permCtx = await getRoutePermissionContext(auth.userId, auth.orgId, "leaves", "create");
    if (!permCtx.allowed) {
      return NextResponse.json({ error: "You don't have permission to create leave requests" }, { status: 403 });
    }

    const body = await request.json();

    // Validate base schema
    const validationResult = createLeaveSchema.safeParse(body);
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

    // Check for overlapping leaves
    const overlapping = await prisma.leave.findFirst({
      where: {
        orgId: auth.orgId,
        employeeId: data.employeeId,
        status: { in: ["PENDING", "APPROVED"] },
        OR: [
          {
            startDate: { lte: new Date(data.endDate) },
            endDate: { gte: new Date(data.startDate) },
          },
        ],
      },
    });
    if (overlapping) {
      return NextResponse.json(
        { error: "This leave request overlaps with an existing leave" },
        { status: 409 }
      );
    }

    // Create leave
    const leave = await prisma.leave.create({
      data: {
        orgId: auth.orgId,
        employeeId: data.employeeId,
        type: data.type,
        status: "PENDING",
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        days: new Prisma.Decimal(data.days),
        reason: data.reason,
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
      module: "LEAVE",
      recordId: leave.id,
      actorType: "USER",
      actorId: auth.userId,
      newState: leave as unknown as Record<string, unknown>,
    });

    return NextResponse.json(leave, { status: 201 });
  } catch (error) {
    console.error("Error creating leave:", error);
    return NextResponse.json(
      { error: "Failed to create leave request" },
      { status: 500 }
    );
  }
}
