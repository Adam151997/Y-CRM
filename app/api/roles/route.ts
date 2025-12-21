import { NextRequest, NextResponse } from "next/server";
import { getApiAuthContext } from "@/lib/auth";
import prisma from "@/lib/db";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { checkRoutePermission } from "@/lib/api-permissions";

export const dynamic = "force-dynamic";

// Validation schema for creating a role
const createRoleSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  isDefault: z.boolean().optional(),
  permissions: z.array(z.object({
    module: z.string(),
    actions: z.array(z.enum(["view", "create", "edit", "delete"])),
    fields: z.record(z.array(z.string())).nullable().optional(),
    recordVisibility: z.enum(["ALL", "OWN_ONLY", "UNASSIGNED"]).optional(),
  })).optional(),
});

/**
 * GET /api/roles
 * List all roles for the organization
 */
export async function GET() {
  try {
    const auth = await getApiAuthContext();
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check settings view permission
    const permissionError = await checkRoutePermission(auth.userId, auth.orgId, "settings", "view");
    if (permissionError) return permissionError;

    const roles = await prisma.role.findMany({
      where: { orgId: auth.orgId },
      include: {
        _count: {
          select: { userRoles: true },
        },
        permissions: true,
      },
      orderBy: [
        { isSystem: "desc" },
        { name: "asc" },
      ],
    });

    return NextResponse.json({
      roles: roles.map((role) => ({
        id: role.id,
        name: role.name,
        description: role.description,
        isDefault: role.isDefault,
        isSystem: role.isSystem,
        userCount: role._count.userRoles,
        permissionCount: role.permissions.length,
        createdAt: role.createdAt,
      })),
    });
  } catch (error) {
    console.error("Error fetching roles:", error);
    return NextResponse.json(
      { error: "Failed to fetch roles" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/roles
 * Create a new role
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await getApiAuthContext();
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check settings create permission
    const permissionError = await checkRoutePermission(auth.userId, auth.orgId, "settings", "create");
    if (permissionError) return permissionError;

    const body = await request.json();
    const validated = createRoleSchema.parse(body);

    // Check for duplicate name
    const existing = await prisma.role.findUnique({
      where: {
        orgId_name: {
          orgId: auth.orgId,
          name: validated.name,
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "A role with this name already exists" },
        { status: 400 }
      );
    }

    // If setting as default, unset other defaults
    if (validated.isDefault) {
      await prisma.role.updateMany({
        where: { orgId: auth.orgId, isDefault: true },
        data: { isDefault: false },
      });
    }

    // Create role with permissions
    const role = await prisma.role.create({
      data: {
        orgId: auth.orgId,
        name: validated.name,
        description: validated.description,
        isDefault: validated.isDefault || false,
        permissions: validated.permissions
          ? {
              create: validated.permissions.map((p) => ({
                module: p.module,
                actions: p.actions,
                fields: p.fields ? (p.fields as Prisma.InputJsonValue) : Prisma.JsonNull,
                recordVisibility: p.recordVisibility || "ALL",
              })),
            }
          : undefined,
      },
      include: {
        permissions: true,
        _count: {
          select: { userRoles: true },
        },
      },
    });

    return NextResponse.json({
      role: {
        id: role.id,
        name: role.name,
        description: role.description,
        isDefault: role.isDefault,
        isSystem: role.isSystem,
        userCount: role._count.userRoles,
        permissions: role.permissions,
        createdAt: role.createdAt,
      },
    }, { status: 201 });
  } catch (error) {
    console.error("Error creating role:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to create role" },
      { status: 500 }
    );
  }
}
