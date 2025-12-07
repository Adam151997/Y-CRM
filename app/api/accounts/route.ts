import { NextRequest, NextResponse } from "next/server";
import { getApiAuthContext } from "@/lib/auth";
import prisma from "@/lib/db";
import { Prisma } from "@prisma/client";
import { createAuditLog } from "@/lib/audit";
import { createAccountSchema } from "@/lib/validation/schemas";
import { validateCustomFields } from "@/lib/validation/custom-fields";
import { z } from "zod";

// Filter schema
const accountFilterSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.string().default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
  query: z.string().optional(),
  type: z.string().optional(),
  industry: z.string().optional(),
  rating: z.string().optional(),
});

// GET /api/accounts - List accounts with filtering and pagination
export async function GET(request: NextRequest) {
  try {
    const auth = await getApiAuthContext();
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const params = Object.fromEntries(searchParams.entries());

    // Validate filter params
    const filterResult = accountFilterSchema.safeParse(params);
    if (!filterResult.success) {
      return NextResponse.json(
        { error: "Invalid parameters", details: filterResult.error.format() },
        { status: 400 }
      );
    }

    const { page, limit, sortBy, sortOrder, query, type, industry, rating } =
      filterResult.data;

    // Build where clause
    const where: Record<string, unknown> = { orgId: auth.orgId };

    if (type) where.type = type;
    if (industry) where.industry = industry;
    if (rating) where.rating = rating;

    if (query) {
      where.OR = [
        { name: { contains: query, mode: "insensitive" } },
        { website: { contains: query, mode: "insensitive" } },
        { industry: { contains: query, mode: "insensitive" } },
      ];
    }

    // Execute query
    const [accounts, total] = await Promise.all([
      prisma.account.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          _count: {
            select: {
              contacts: true,
              opportunities: true,
              notes: true,
            },
          },
        },
      }),
      prisma.account.count({ where }),
    ]);

    return NextResponse.json({
      data: accounts,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Error fetching accounts:", error);
    return NextResponse.json(
      { error: "Failed to fetch accounts" },
      { status: 500 }
    );
  }
}

// POST /api/accounts - Create a new account
export async function POST(request: NextRequest) {
  try {
    const auth = await getApiAuthContext();
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    // Validate base schema
    const validationResult = createAccountSchema.safeParse(body);
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
        "ACCOUNT",
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

    // Create account
    const account = await prisma.account.create({
      data: {
        orgId: auth.orgId,
        name: data.name,
        industry: data.industry,
        website: data.website,
        phone: data.phone,
        address: data.address === null 
          ? Prisma.JsonNull 
          : data.address === undefined 
            ? undefined 
            : (data.address as Prisma.InputJsonValue),
        annualRevenue: data.annualRevenue,
        employeeCount: data.employeeCount,
        type: data.type,
        rating: data.rating,
        assignedToId: data.assignedToId || auth.userId,
        customFields: data.customFields 
          ? (data.customFields as Prisma.InputJsonValue) 
          : {},
      },
    });

    // Audit log
    await createAuditLog({
      orgId: auth.orgId,
      action: "CREATE",
      module: "ACCOUNT",
      recordId: account.id,
      actorType: "USER",
      actorId: auth.userId,
      newState: account as unknown as Record<string, unknown>,
    });

    return NextResponse.json(account, { status: 201 });
  } catch (error) {
    console.error("Error creating account:", error);
    return NextResponse.json(
      { error: "Failed to create account" },
      { status: 500 }
    );
  }
}
