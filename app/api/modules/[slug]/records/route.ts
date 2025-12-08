import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getApiAuthContext } from "@/lib/auth";
import prisma from "@/lib/db";
import { createAuditLog } from "@/lib/audit";
import { Prisma } from "@prisma/client";

interface RouteParams {
  params: Promise<{ slug: string }>;
}

/**
 * Helper to get module by slug with validation
 */
async function getModuleBySlug(orgId: string, slug: string) {
  return prisma.customModule.findFirst({
    where: {
      orgId,
      slug,
      isActive: true,
    },
    include: {
      fields: {
        where: { isActive: true },
        orderBy: { displayOrder: "asc" },
      },
    },
  });
}

/**
 * Validate record data against field definitions
 */
function validateRecordData(
  data: Record<string, unknown>,
  fields: Array<{
    fieldKey: string;
    fieldType: string;
    required: boolean;
    options?: unknown;
  }>
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  for (const field of fields) {
    const value = data[field.fieldKey];

    // Check required fields
    if (field.required && (value === undefined || value === null || value === "")) {
      errors.push(`${field.fieldKey} is required`);
      continue;
    }

    // Skip validation if value is empty and not required
    if (value === undefined || value === null || value === "") {
      continue;
    }

    // Type validation
    switch (field.fieldType) {
      case "NUMBER":
      case "CURRENCY":
      case "PERCENT":
        if (typeof value !== "number" && isNaN(Number(value))) {
          errors.push(`${field.fieldKey} must be a number`);
        }
        break;

      case "BOOLEAN":
        if (typeof value !== "boolean") {
          errors.push(`${field.fieldKey} must be a boolean`);
        }
        break;

      case "DATE":
        if (isNaN(Date.parse(String(value)))) {
          errors.push(`${field.fieldKey} must be a valid date`);
        }
        break;

      case "EMAIL":
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value))) {
          errors.push(`${field.fieldKey} must be a valid email`);
        }
        break;

      case "URL":
        try {
          new URL(String(value));
        } catch {
          errors.push(`${field.fieldKey} must be a valid URL`);
        }
        break;

      case "SELECT":
        if (field.options && Array.isArray(field.options)) {
          if (!field.options.includes(value)) {
            errors.push(`${field.fieldKey} must be one of: ${(field.options as string[]).join(", ")}`);
          }
        }
        break;

      case "MULTISELECT":
        if (!Array.isArray(value)) {
          errors.push(`${field.fieldKey} must be an array`);
        } else if (field.options && Array.isArray(field.options)) {
          const invalid = value.filter((v) => !(field.options as string[]).includes(v));
          if (invalid.length > 0) {
            errors.push(`${field.fieldKey} contains invalid options: ${invalid.join(", ")}`);
          }
        }
        break;
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * GET /api/modules/[slug]/records
 * List records for a custom module
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await getApiAuthContext();
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { slug } = await params;
    const { searchParams } = new URL(request.url);

    // Get the module
    const module = await getModuleBySlug(auth.orgId, slug);
    if (!module) {
      return NextResponse.json({ error: "Module not found" }, { status: 404 });
    }

    // Pagination
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const skip = (page - 1) * limit;

    // Search
    const query = searchParams.get("query");

    // Sorting
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const sortOrder = searchParams.get("sortOrder") || "desc";

    // Build query
    let where: Record<string, unknown> = {
      orgId: auth.orgId,
      moduleId: module.id,
    };

    // For search, we need to search in JSON data
    // This is a simple implementation - for production, consider full-text search
    if (query) {
      // Search in the label field
      where = {
        ...where,
        data: {
          path: [module.labelField],
          string_contains: query,
        },
      };
    }

    // Fetch records
    const [records, total] = await Promise.all([
      prisma.customModuleRecord.findMany({
        where,
        orderBy: sortBy === "createdAt" 
          ? { createdAt: sortOrder as "asc" | "desc" }
          : sortBy === "updatedAt"
          ? { updatedAt: sortOrder as "asc" | "desc" }
          : { createdAt: sortOrder as "asc" | "desc" },
        skip,
        take: limit,
      }),
      prisma.customModuleRecord.count({ where }),
    ]);

    return NextResponse.json({
      records,
      module,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("[API] Error fetching records:", error);
    return NextResponse.json(
      { error: "Failed to fetch records" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/modules/[slug]/records
 * Create a new record in a custom module
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await getApiAuthContext();
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { slug } = await params;
    const body = await request.json();

    // Get the module with fields
    const module = await getModuleBySlug(auth.orgId, slug);
    if (!module) {
      return NextResponse.json({ error: "Module not found" }, { status: 404 });
    }

    // Extract data and assignedToId
    const { data, assignedToId } = body as {
      data: Record<string, unknown>;
      assignedToId?: string;
    };

    // Validate data against field definitions
    const validation = validateRecordData(data, module.fields);
    if (!validation.valid) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.errors },
        { status: 400 }
      );
    }

    // Create the record
    const record = await prisma.customModuleRecord.create({
      data: {
        orgId: auth.orgId,
        moduleId: module.id,
        data: data as Prisma.InputJsonValue,
        assignedToId,
        createdById: auth.userId,
        createdByType: "USER",
      },
    });

    // Audit log
    await createAuditLog({
      orgId: auth.orgId,
      action: "CREATE",
      module: "CUSTOM_MODULE_RECORD",
      recordId: record.id,
      actorType: "USER",
      actorId: auth.userId,
      newState: record as unknown as Record<string, unknown>,
      metadata: { moduleSlug: module.slug, moduleName: module.name },
    });

    return NextResponse.json({ record }, { status: 201 });
  } catch (error) {
    console.error("[API] Error creating record:", error);
    return NextResponse.json(
      { error: "Failed to create record" },
      { status: 500 }
    );
  }
}
