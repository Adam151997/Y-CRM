import { NextRequest, NextResponse } from "next/server";
import { getApiAuthContext } from "@/lib/auth";
import prisma from "@/lib/db";
import { Prisma } from "@prisma/client";
import { z } from "zod";

export const dynamic = "force-dynamic";

// Validation schema for updating a role
const updateRoleSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional().nullable(),
  isDefault: z.boolean().optional(),
  permissions: z.array(z.object({
    module: z.string(),
    actions: z.array(z.enum(["view", "create", "edit", "delete"])),
    fields: z.record(z.array(z.string())).nullable().optional(),
  })).optional(),
});

/**
 * GET /api/roles/[id]
 * Get a single role with permissions
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getApiAuthContext();
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const role = await prisma.role.findFirst({
      where: {
        id,
        orgId: auth.orgId,
      },
      include: {
        permissions: true,
        _count: {
          select: { userRoles: true },
        },
      },
    });

    if (!role) {
      return NextResponse.json({ error: "Role not found" }, { status: 404 });
    }

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
        updatedAt: role.updatedAt,
      },
    });
  } catch (error) {
    console.error("Error fetching role:", error);
    return NextResponse.json(
      { error: "Failed to fetch role" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/roles/[id]
 * Update a role and its permissions
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getApiAuthContext();
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const validated = updateRoleSchema.parse(body);

    // Check if role exists and belongs to org
    const existingRole = await prisma.role.findFirst({
      where: {
        id,
        orgId: auth.orgId,
      },
    });

    if (!existingRole) {
      return NextResponse.json({ error: "Role not found" }, { status: 404 });
    }

    // Can't modify system roles' core properties
    if (existingRole.isSystem && validated.name && validated.name !== existingRole.name) {
      return NextResponse.json(
        { error: "Cannot rename system roles" },
        { status: 400 }
      );
    }

    // Check for duplicate name
    if (validated.name && validated.name !== existingRole.name) {
      const duplicate = await prisma.role.findUnique({
        where: {
          orgId_name: {
            orgId: auth.orgId,
            name: validated.name,
          },
        },
      });

      if (duplicate) {
        return NextResponse.json(
          { error: "A role with this name already exists" },
          { status: 400 }
        );
      }
    }

    // If setting as default, unset other defaults
    if (validated.isDefault) {
      await prisma.role.updateMany({
        where: { orgId: auth.orgId, isDefault: true, id: { not: id } },
        data: { isDefault: false },
      });
    }

    // Update role
    const role = await prisma.$transaction(async (tx) => {
      // Update role basic info
      const updatedRole = await tx.role.update({
        where: { id },
        data: {
          name: validated.name,
          description: validated.description,
          isDefault: validated.isDefault,
        },
      });

      // Update permissions if provided
      if (validated.permissions) {
        // Delete existing permissions
        await tx.permission.deleteMany({
          where: { roleId: id },
        });

        // Create new permissions
        await tx.permission.createMany({
          data: validated.permissions.map((p) => ({
            roleId: id,
            module: p.module,
            actions: p.actions,
            fields: p.fields ? (p.fields as Prisma.InputJsonValue) : Prisma.JsonNull,
          })),
        });
      }

      // Fetch updated role with permissions
      return tx.role.findUnique({
        where: { id },
        include: {
          permissions: true,
          _count: {
            select: { userRoles: true },
          },
        },
      });
    });

    return NextResponse.json({ role });
  } catch (error) {
    console.error("Error updating role:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to update role" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/roles/[id]
 * Delete a role
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getApiAuthContext();
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Check if role exists
    const role = await prisma.role.findFirst({
      where: {
        id,
        orgId: auth.orgId,
      },
      include: {
        _count: {
          select: { userRoles: true },
        },
      },
    });

    if (!role) {
      return NextResponse.json({ error: "Role not found" }, { status: 404 });
    }

    // Can't delete system roles
    if (role.isSystem) {
      return NextResponse.json(
        { error: "Cannot delete system roles" },
        { status: 400 }
      );
    }

    // Can't delete role with assigned users
    if (role._count.userRoles > 0) {
      return NextResponse.json(
        { error: "Cannot delete role with assigned users. Reassign users first." },
        { status: 400 }
      );
    }

    // Delete role (permissions cascade)
    await prisma.role.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting role:", error);
    return NextResponse.json(
      { error: "Failed to delete role" },
      { status: 500 }
    );
  }
}
