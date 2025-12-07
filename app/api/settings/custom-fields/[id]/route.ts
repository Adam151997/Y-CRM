import { NextRequest, NextResponse } from "next/server";
import { getApiAuthContext } from "@/lib/auth";
import prisma from "@/lib/db";
import { updateCustomFieldSchema } from "@/lib/validation/schemas";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/settings/custom-fields/[id] - Get a single custom field
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await getApiAuthContext();
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const customField = await prisma.customFieldDefinition.findFirst({
      where: { id, orgId: auth.orgId },
    });

    if (!customField) {
      return NextResponse.json({ error: "Custom field not found" }, { status: 404 });
    }

    return NextResponse.json(customField);
  } catch (error) {
    console.error("Error fetching custom field:", error);
    return NextResponse.json(
      { error: "Failed to fetch custom field" },
      { status: 500 }
    );
  }
}

// PUT /api/settings/custom-fields/[id] - Update a custom field
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await getApiAuthContext();
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    // Validate
    const validationResult = updateCustomFieldSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validationResult.error.format() },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    // Check exists
    const existing = await prisma.customFieldDefinition.findFirst({
      where: { id, orgId: auth.orgId },
    });

    if (!existing) {
      return NextResponse.json({ error: "Custom field not found" }, { status: 404 });
    }

    // Update
    const updated = await prisma.customFieldDefinition.update({
      where: { id },
      data,
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating custom field:", error);
    return NextResponse.json(
      { error: "Failed to update custom field" },
      { status: 500 }
    );
  }
}

// DELETE /api/settings/custom-fields/[id] - Delete a custom field
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await getApiAuthContext();
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Check exists
    const existing = await prisma.customFieldDefinition.findFirst({
      where: { id, orgId: auth.orgId },
    });

    if (!existing) {
      return NextResponse.json({ error: "Custom field not found" }, { status: 404 });
    }

    // Delete
    await prisma.customFieldDefinition.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting custom field:", error);
    return NextResponse.json(
      { error: "Failed to delete custom field" },
      { status: 500 }
    );
  }
}
