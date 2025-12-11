import { NextRequest, NextResponse } from "next/server";
import { getApiAuthContext } from "@/lib/auth";
import prisma from "@/lib/db";
import { z } from "zod";

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

    const roles = await prisma.role.findMany({
      where: { orgId: auth.orgId },
      include: {
        permissions: true,
        _count: {
          select: { userRoles: true },
        },
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
        permissions: role.permissions,
        createdAt: role.createdAt,
        updatedAt: role.updatedAt,
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

    const body = await request.json();
    const validated = createRoleSchema.parse(body);

    // Check if role name already exists
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

    // If this role is set as default, unset other defaults
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
                fields: p.fields || null,
              })),
            }
          : undefined,
      },
      include: {
        permissions: true,
      },
    });

    return NextResponse.json({ role }, { status: 201 });
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
