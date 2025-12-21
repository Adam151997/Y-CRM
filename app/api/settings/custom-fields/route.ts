import { NextRequest, NextResponse } from "next/server";
import { getApiAuthContext } from "@/lib/auth";
import prisma from "@/lib/db";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { checkRoutePermission } from "@/lib/api-permissions";

// Schema for creating custom fields (supports both built-in and custom modules)
const createCustomFieldSchema = z.object({
  // For built-in modules
  module: z.enum(["LEAD", "CONTACT", "ACCOUNT", "OPPORTUNITY"]).optional(),
  // For custom modules
  customModuleId: z.string().uuid().optional(),
  // Field definition
  fieldName: z.string().min(1).max(100),
  fieldKey: z.string().min(1).max(50).regex(/^[a-z][a-z0-9_]*$/),
  fieldType: z.enum([
    "TEXT",
    "TEXTAREA", 
    "NUMBER",
    "CURRENCY",
    "PERCENT",
    "DATE",
    "SELECT",
    "MULTISELECT",
    "BOOLEAN",
    "URL",
    "EMAIL",
    "PHONE",
    "RELATIONSHIP",
    "FILE",
  ]),
  required: z.boolean().default(false),
  options: z.array(z.string()).optional(),
  defaultValue: z.unknown().optional(),
  placeholder: z.string().max(200).nullable().optional(),
  helpText: z.string().max(500).nullable().optional(),
  relatedModule: z.string().optional(), // For RELATIONSHIP type
}).refine((data) => {
  // Must have either module OR customModuleId, but not both
  return (data.module && !data.customModuleId) || (!data.module && data.customModuleId);
}, {
  message: "Must specify either module (for built-in) or customModuleId (for custom), but not both",
});

// GET /api/settings/custom-fields - List custom fields
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
    const module = searchParams.get("module");
    const customModuleId = searchParams.get("customModuleId");

    const where: Record<string, unknown> = { orgId: auth.orgId };
    
    if (module) {
      where.module = module;
      where.customModuleId = null;
    } else if (customModuleId) {
      where.customModuleId = customModuleId;
      where.module = null;
    }

    const customFields = await prisma.customFieldDefinition.findMany({
      where,
      orderBy: [{ displayOrder: "asc" }],
    });

    return NextResponse.json(customFields);
  } catch (error) {
    console.error("Error fetching custom fields:", error);
    return NextResponse.json(
      { error: "Failed to fetch custom fields" },
      { status: 500 }
    );
  }
}

// POST /api/settings/custom-fields - Create a custom field
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

    // Validate
    const validationResult = createCustomFieldSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validationResult.error.format() },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    // If customModuleId provided, verify it exists and belongs to org
    if (data.customModuleId) {
      const customModule = await prisma.customModule.findFirst({
        where: {
          id: data.customModuleId,
          orgId: auth.orgId,
        },
      });

      if (!customModule) {
        return NextResponse.json(
          { error: "Custom module not found" },
          { status: 404 }
        );
      }
    }

    // Check for duplicate fieldKey
    const existingWhere: Record<string, unknown> = {
      orgId: auth.orgId,
      fieldKey: data.fieldKey,
    };

    if (data.module) {
      existingWhere.module = data.module;
    } else {
      existingWhere.customModuleId = data.customModuleId;
    }

    const existing = await prisma.customFieldDefinition.findFirst({
      where: existingWhere,
    });

    if (existing) {
      return NextResponse.json(
        { error: "A field with this key already exists in this module" },
        { status: 400 }
      );
    }

    // Get the max displayOrder for the module
    const maxOrderWhere: Record<string, unknown> = { orgId: auth.orgId };
    if (data.module) {
      maxOrderWhere.module = data.module;
    } else {
      maxOrderWhere.customModuleId = data.customModuleId;
    }

    const maxOrder = await prisma.customFieldDefinition.aggregate({
      where: maxOrderWhere,
      _max: { displayOrder: true },
    });

    // Create custom field
    const customField = await prisma.customFieldDefinition.create({
      data: {
        orgId: auth.orgId,
        module: data.module || null,
        customModuleId: data.customModuleId || null,
        fieldName: data.fieldName,
        fieldKey: data.fieldKey,
        fieldType: data.fieldType,
        required: data.required,
        options: data.options 
          ? (data.options as Prisma.InputJsonValue) 
          : undefined,
        defaultValue: data.defaultValue !== undefined 
          ? (data.defaultValue as Prisma.InputJsonValue) 
          : undefined,
        placeholder: data.placeholder || null,
        helpText: data.helpText || null,
        relatedModule: data.relatedModule || null,
        displayOrder: (maxOrder._max.displayOrder || 0) + 1,
      },
    });

    return NextResponse.json(customField, { status: 201 });
  } catch (error) {
    console.error("Error creating custom field:", error);
    return NextResponse.json(
      { error: "Failed to create custom field" },
      { status: 500 }
    );
  }
}
