import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getApiAuthContext } from "@/lib/auth";
import prisma from "@/lib/db";
import { createAuditLog } from "@/lib/audit";
import { checkRoutePermission } from "@/lib/api-permissions";

// Validation schema for creating a custom module
const createModuleSchema = z.object({
  name: z.string().min(1, "Name is required").max(50),
  pluralName: z.string().min(1, "Plural name is required").max(50),
  slug: z
    .string()
    .min(1)
    .max(50)
    .regex(/^[a-z0-9-]+$/, "Slug must be lowercase letters, numbers, and hyphens only"),
  description: z.string().max(500).optional(),
  icon: z.string().default("box"),
  color: z.string().optional(),
  labelField: z.string().default("name"),
  showInSidebar: z.boolean().default(true),
});

/**
 * GET /api/custom-modules
 * List all custom modules for the organization
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await getApiAuthContext();
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check settings view permission
    const permissionError = await checkRoutePermission(auth.userId, auth.orgId, "settings", "view");
    if (permissionError) return permissionError;

    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get("active") !== "false";

    const modules = await prisma.customModule.findMany({
      where: {
        orgId: auth.orgId,
        ...(activeOnly ? { isActive: true } : {}),
      },
      include: {
        _count: {
          select: {
            records: true,
            fields: true,
          },
        },
      },
      orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
    });

    return NextResponse.json({ modules });
  } catch (error) {
    console.error("[API] Error fetching custom modules:", error);
    return NextResponse.json(
      { error: "Failed to fetch custom modules" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/custom-modules
 * Create a new custom module
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
    const validated = createModuleSchema.parse(body);

    // Check for reserved slugs (built-in modules)
    const reservedSlugs = [
      "leads",
      "contacts",
      "accounts",
      "opportunities",
      "tasks",
      "notes",
      "dashboard",
      "settings",
      "reports",
      "pipeline",
      "documents",
      "assistant",
    ];

    if (reservedSlugs.includes(validated.slug)) {
      return NextResponse.json(
        { error: `"${validated.slug}" is a reserved module name` },
        { status: 400 }
      );
    }

    // Check if slug already exists
    const existing = await prisma.customModule.findUnique({
      where: {
        orgId_slug: {
          orgId: auth.orgId,
          slug: validated.slug,
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "A module with this slug already exists" },
        { status: 400 }
      );
    }

    // Get the next display order
    const lastModule = await prisma.customModule.findFirst({
      where: { orgId: auth.orgId },
      orderBy: { displayOrder: "desc" },
      select: { displayOrder: true },
    });

    const displayOrder = (lastModule?.displayOrder ?? -1) + 1;

    // Create the module
    const module = await prisma.customModule.create({
      data: {
        orgId: auth.orgId,
        name: validated.name,
        pluralName: validated.pluralName,
        slug: validated.slug,
        description: validated.description,
        icon: validated.icon,
        color: validated.color,
        labelField: validated.labelField,
        showInSidebar: validated.showInSidebar,
        displayOrder,
      },
    });

    // Create default "name" field for the module
    await prisma.customFieldDefinition.create({
      data: {
        orgId: auth.orgId,
        customModuleId: module.id,
        fieldName: "Name",
        fieldKey: "name",
        fieldType: "TEXT",
        required: true,
        isSystem: true,
        displayOrder: 0,
      },
    });

    // Audit log
    await createAuditLog({
      orgId: auth.orgId,
      action: "CREATE",
      module: "CUSTOM_MODULE",
      recordId: module.id,
      actorType: "USER",
      actorId: auth.userId,
      newState: module as unknown as Record<string, unknown>,
    });

    return NextResponse.json({ module }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 }
      );
    }

    console.error("[API] Error creating custom module:", error);
    return NextResponse.json(
      { error: "Failed to create custom module" },
      { status: 500 }
    );
  }
}
