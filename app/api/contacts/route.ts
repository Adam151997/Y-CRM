import { NextRequest, NextResponse } from "next/server";
import { getApiAuthContext } from "@/lib/auth";
import prisma from "@/lib/db";
import { Prisma } from "@prisma/client";
import { createAuditLog } from "@/lib/audit";
import { createContactSchema } from "@/lib/validation/schemas";
import { validateCustomFields } from "@/lib/validation/custom-fields";
import { z } from "zod";

// Filter schema
const contactFilterSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.string().default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
  query: z.string().optional(),
  accountId: z.string().uuid().optional(),
  assignedToId: z.string().optional(),
});

// GET /api/contacts - List contacts with filtering and pagination
export async function GET(request: NextRequest) {
  try {
    const auth = await getApiAuthContext();
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const params = Object.fromEntries(searchParams.entries());

    // Validate filter params
    const filterResult = contactFilterSchema.safeParse(params);
    if (!filterResult.success) {
      return NextResponse.json(
        { error: "Invalid parameters", details: filterResult.error.format() },
        { status: 400 }
      );
    }

    const { page, limit, sortBy, sortOrder, query, accountId, assignedToId } =
      filterResult.data;

    // Build where clause
    const where: Record<string, unknown> = { orgId: auth.orgId };

    if (accountId) where.accountId = accountId;
    if (assignedToId) where.assignedToId = assignedToId;

    if (query) {
      where.OR = [
        { firstName: { contains: query, mode: "insensitive" } },
        { lastName: { contains: query, mode: "insensitive" } },
        { email: { contains: query, mode: "insensitive" } },
        { title: { contains: query, mode: "insensitive" } },
      ];
    }

    // Execute query
    const [contacts, total] = await Promise.all([
      prisma.contact.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          account: {
            select: { id: true, name: true },
          },
          _count: {
            select: { notes: true, tasks: true },
          },
        },
      }),
      prisma.contact.count({ where }),
    ]);

    return NextResponse.json({
      data: contacts,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Error fetching contacts:", error);
    return NextResponse.json(
      { error: "Failed to fetch contacts" },
      { status: 500 }
    );
  }
}

// POST /api/contacts - Create a new contact
export async function POST(request: NextRequest) {
  try {
    const auth = await getApiAuthContext();
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    // Validate base schema
    const validationResult = createContactSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validationResult.error.format() },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    // Validate custom fields if present
    if (data.customFields && Object.keys(data.customFields).length > 0) {
      const customFieldValidation = await validateCustomFields(
        auth.orgId,
        "CONTACT",
        data.customFields
      );
      if (!customFieldValidation.success) {
        return NextResponse.json(
          { error: "Custom field validation failed", details: customFieldValidation.errors },
          { status: 400 }
        );
      }
      data.customFields = customFieldValidation.data;
    }

    // Check for duplicate email
    if (data.email) {
      const existing = await prisma.contact.findFirst({
        where: {
          orgId: auth.orgId,
          email: data.email,
        },
      });
      if (existing) {
        return NextResponse.json(
          { error: "A contact with this email already exists" },
          { status: 409 }
        );
      }
    }

    // Verify account exists if provided
    if (data.accountId) {
      const account = await prisma.account.findFirst({
        where: { id: data.accountId, orgId: auth.orgId },
      });
      if (!account) {
        return NextResponse.json(
          { error: "Account not found" },
          { status: 400 }
        );
      }
    }

    // Create contact
    const contact = await prisma.contact.create({
      data: {
        orgId: auth.orgId,
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone,
        title: data.title,
        department: data.department,
        accountId: data.accountId,
        isPrimary: data.isPrimary,
        assignedToId: data.assignedToId || auth.userId,
        customFields: data.customFields 
          ? (data.customFields as Prisma.InputJsonValue) 
          : {},
      },
      include: {
        account: {
          select: { id: true, name: true },
        },
      },
    });

    // Audit log
    await createAuditLog({
      orgId: auth.orgId,
      action: "CREATE",
      module: "CONTACT",
      recordId: contact.id,
      actorType: "USER",
      actorId: auth.userId,
      newState: contact as unknown as Record<string, unknown>,
    });

    return NextResponse.json(contact, { status: 201 });
  } catch (error) {
    console.error("Error creating contact:", error);
    return NextResponse.json(
      { error: "Failed to create contact" },
      { status: 500 }
    );
  }
}
