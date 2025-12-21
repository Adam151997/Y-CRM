import { NextRequest, NextResponse } from "next/server";
import { getApiAuthContext } from "@/lib/auth";
import prisma from "@/lib/db";
import { createAuditLog } from "@/lib/audit";
import { z } from "zod";
import { getRoutePermissionContext, checkRoutePermission } from "@/lib/api-permissions";

// Validation schemas
const createTicketSchema = z.object({
  subject: z.string().min(1).max(200),
  description: z.string().optional(),
  accountId: z.string().uuid(),
  contactId: z.string().uuid().optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).default("MEDIUM"),
  category: z.string().optional(),
  assignedToId: z.string().optional(),
});

const ticketFilterSchema = z.object({
  page: z.coerce.number().positive().default(1),
  limit: z.coerce.number().positive().max(100).default(20),
  status: z.string().optional(),
  priority: z.string().optional(),
  category: z.string().optional(),
  accountId: z.string().optional(),
  assignedToId: z.string().optional(),
  query: z.string().optional(),
});

// GET /api/cs/tickets - List tickets with filtering and pagination
export async function GET(request: NextRequest) {
  try {
    const auth = await getApiAuthContext();
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check permission
    const permCtx = await getRoutePermissionContext(auth.userId, auth.orgId, "tickets", "view");
    if (!permCtx.allowed) {
      return NextResponse.json({ error: "You don't have permission to view tickets" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const params = Object.fromEntries(searchParams.entries());

    const filterResult = ticketFilterSchema.safeParse(params);
    if (!filterResult.success) {
      return NextResponse.json(
        { error: "Invalid parameters", details: filterResult.error.format() },
        { status: 400 }
      );
    }

    const { page, limit, status, priority, category, accountId, assignedToId, query } = filterResult.data;

    // Build where clause with visibility filter
    const where: Record<string, unknown> = { 
      orgId: auth.orgId,
      ...permCtx.visibilityFilter,
    };

    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (category) where.category = category;
    if (accountId) where.accountId = accountId;
    if (assignedToId) where.assignedToId = assignedToId;

    if (query) {
      const ticketNumber = parseInt(query);
      where.OR = [
        { subject: { contains: query, mode: "insensitive" } },
        ...(isNaN(ticketNumber) ? [] : [{ ticketNumber }]),
      ];
    }

    // Execute query
    const [tickets, total] = await Promise.all([
      prisma.ticket.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          account: { select: { id: true, name: true } },
          contact: { select: { id: true, firstName: true, lastName: true } },
          _count: { select: { messages: true } },
        },
      }),
      prisma.ticket.count({ where }),
    ]);

    return NextResponse.json({
      data: tickets,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Error fetching tickets:", error);
    return NextResponse.json(
      { error: "Failed to fetch tickets" },
      { status: 500 }
    );
  }
}

// POST /api/cs/tickets - Create a new ticket
export async function POST(request: NextRequest) {
  try {
    const auth = await getApiAuthContext();
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check permission
    const permissionError = await checkRoutePermission(auth.userId, auth.orgId, "tickets", "create");
    if (permissionError) return permissionError;

    const body = await request.json();

    const validationResult = createTicketSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validationResult.error.format() },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    // Verify account exists and belongs to org
    const account = await prisma.account.findFirst({
      where: { id: data.accountId, orgId: auth.orgId },
    });
    if (!account) {
      return NextResponse.json(
        { error: "Account not found" },
        { status: 404 }
      );
    }

    // Verify contact if provided
    if (data.contactId && data.contactId !== "_none") {
      const contact = await prisma.contact.findFirst({
        where: { id: data.contactId, orgId: auth.orgId },
      });
      if (!contact) {
        return NextResponse.json(
          { error: "Contact not found" },
          { status: 404 }
        );
      }
    }

    // Create ticket
    const ticket = await prisma.ticket.create({
      data: {
        orgId: auth.orgId,
        subject: data.subject,
        description: data.description,
        accountId: data.accountId,
        contactId: data.contactId && data.contactId !== "_none" ? data.contactId : null,
        priority: data.priority,
        category: data.category && data.category !== "_none" ? data.category : null,
        status: "NEW",
        createdById: auth.userId,
        createdByType: "USER",
        assignedToId: data.assignedToId && data.assignedToId !== "_none" ? data.assignedToId : null,
      },
      include: {
        account: { select: { id: true, name: true } },
        contact: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    // Create activity log
    await prisma.activity.create({
      data: {
        orgId: auth.orgId,
        type: "TICKET_CREATED",
        subject: `Ticket #${ticket.ticketNumber} created`,
        description: ticket.subject,
        workspace: "cs",
        accountId: ticket.accountId,
        contactId: ticket.contactId,
        performedById: auth.userId,
        performedByType: "USER",
      },
    });

    // Audit log
    await createAuditLog({
      orgId: auth.orgId,
      action: "CREATE",
      module: "TICKET",
      recordId: ticket.id,
      actorType: "USER",
      actorId: auth.userId,
      newState: ticket as unknown as Record<string, unknown>,
    });

    return NextResponse.json({ ticket }, { status: 201 });
  } catch (error) {
    console.error("Error creating ticket:", error);
    return NextResponse.json(
      { error: "Failed to create ticket" },
      { status: 500 }
    );
  }
}
