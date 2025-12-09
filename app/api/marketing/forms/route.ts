import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";
import prisma from "@/lib/db";
import { createAuditLog } from "@/lib/audit";
import { z } from "zod";

// GET /api/marketing/forms - List all forms
export async function GET(request: NextRequest) {
  try {
    const { orgId } = await getAuthContext();
    const { searchParams } = new URL(request.url);
    
    const isActive = searchParams.get("isActive");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const skip = (page - 1) * limit;

    // Build where clause
    const where: Record<string, unknown> = { orgId };
    if (isActive === "true") where.isActive = true;
    if (isActive === "false") where.isActive = false;

    const [forms, total] = await Promise.all([
      prisma.form.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: {
          _count: {
            select: { formSubmissions: true },
          },
        },
      }),
      prisma.form.count({ where }),
    ]);

    return NextResponse.json({
      forms,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching forms:", error);
    return NextResponse.json(
      { error: "Failed to fetch forms" },
      { status: 500 }
    );
  }
}

// Form field schema
const formFieldSchema = z.object({
  id: z.string(),
  type: z.enum(["text", "email", "phone", "textarea", "select", "checkbox", "radio", "number", "date"]),
  label: z.string(),
  required: z.boolean().default(false),
  placeholder: z.string().optional(),
  options: z.array(z.string()).optional(), // For select, checkbox, radio
  validation: z.any().optional(),
});

// Create schema
const createFormSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  description: z.string().optional(),
  fields: z.array(formFieldSchema).default([]),
  settings: z.any().optional(),
  createLead: z.boolean().default(true),
  assignToUserId: z.string().optional(),
  leadSource: z.string().default("FORM"),
  slug: z.string().optional(),
});

// POST /api/marketing/forms - Create a new form
export async function POST(request: NextRequest) {
  try {
    const { orgId, userId } = await getAuthContext();
    const body = await request.json();

    // Validate request body
    const validationResult = createFormSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Invalid request data", details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    // Generate slug if not provided
    let slug = data.slug;
    if (!slug) {
      slug = data.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
    }

    // Check if slug is unique
    const existingForm = await prisma.form.findFirst({
      where: { orgId, slug },
    });
    if (existingForm) {
      // Append a random string to make it unique
      slug = `${slug}-${Math.random().toString(36).substring(2, 8)}`;
    }

    // Create form
    const form = await prisma.form.create({
      data: {
        orgId,
        name: data.name,
        description: data.description,
        fields: data.fields,
        settings: data.settings,
        createLead: data.createLead,
        assignToUserId: data.assignToUserId,
        leadSource: data.leadSource,
        slug,
        createdById: userId,
      },
    });

    // Audit log
    await createAuditLog({
      orgId,
      action: "CREATE",
      module: "FORM",
      recordId: form.id,
      actorType: "USER",
      actorId: userId,
      newState: form as unknown as Record<string, unknown>,
    });

    return NextResponse.json({ form }, { status: 201 });
  } catch (error) {
    console.error("Error creating form:", error);
    return NextResponse.json(
      { error: "Failed to create form" },
      { status: 500 }
    );
  }
}
