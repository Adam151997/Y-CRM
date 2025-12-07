import { NextRequest, NextResponse } from "next/server";
import { getApiAuthContext } from "@/lib/auth";
import prisma from "@/lib/db";
import { createCustomFieldSchema } from "@/lib/validation/schemas";

// GET /api/settings/custom-fields - List custom fields
export async function GET(request: NextRequest) {
  try {
    const auth = await getApiAuthContext();
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const module = searchParams.get("module");

    const where: Record<string, unknown> = { orgId: auth.orgId };
    if (module) {
      where.module = module;
    }

    const customFields = await prisma.customFieldDefinition.findMany({
      where,
      orderBy: [{ module: "asc" }, { displayOrder: "asc" }],
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

    // Check for duplicate fieldKey in the same module
    const existing = await prisma.customFieldDefinition.findFirst({
      where: {
        orgId: auth.orgId,
        module: data.module,
        fieldKey: data.fieldKey,
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "A field with this key already exists in this module" },
        { status: 400 }
      );
    }

    // Get the max displayOrder for the module
    const maxOrder = await prisma.customFieldDefinition.aggregate({
      where: { orgId: auth.orgId, module: data.module },
      _max: { displayOrder: true },
    });

    // Create custom field
    const customField = await prisma.customFieldDefinition.create({
      data: {
        orgId: auth.orgId,
        module: data.module,
        fieldName: data.fieldName,
        fieldKey: data.fieldKey,
        fieldType: data.fieldType,
        required: data.required,
        options: data.options,
        defaultValue: data.defaultValue,
        placeholder: data.placeholder,
        helpText: data.helpText,
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
