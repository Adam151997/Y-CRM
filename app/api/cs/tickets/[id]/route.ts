import { NextRequest, NextResponse } from "next/server";
import { getApiAuthContext } from "@/lib/auth";
import prisma from "@/lib/db";
import { createAuditLog } from "@/lib/audit";
import { z } from "zod";
import { triggerTicketEscalationPlaybooks } from "@/lib/playbook-triggers";

const updateTicketSchema = z.object({
  subject: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  status: z.enum(["NEW", "OPEN", "PENDING", "RESOLVED", "CLOSED"]).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  category: z.string().optional(),
  assignedToId: z.string().nullable().optional(),
  resolution: z.string().optional(),
  resolvedAt: z.string().datetime().optional(),
  closedAt: z.string().datetime().optional(),
  satisfactionScore: z.number().min(1).max(5).optional(),
  satisfactionFeedback: z.string().nullable().optional(),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/cs/tickets/[id] - Get single ticket
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await getApiAuthContext();
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const ticket = await prisma.ticket.findFirst({
      where: { id, orgId: auth.orgId },
      include: {
        account: { select: { id: true, name: true } },
        contact: { select: { id: true, firstName: true, lastName: true, email: true } },
        messages: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    return NextResponse.json(ticket);
  } catch (error) {
    console.error("Error fetching ticket:", error);
    return NextResponse.json(
      { error: "Failed to fetch ticket" },
      { status: 500 }
    );
  }
}

// PATCH /api/cs/tickets/[id] - Update ticket
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await getApiAuthContext();
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    const validationResult = updateTicketSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validationResult.error.format() },
        { status: 400 }
      );
    }

    // Get existing ticket
    const existing = await prisma.ticket.findFirst({
      where: { id, orgId: auth.orgId },
    });

    if (!existing) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    const data = validationResult.data;

    // Check if ticket is being escalated to URGENT
    const isEscalatingToUrgent = 
      data.priority === "URGENT" && 
      existing.priority !== "URGENT";

    // Build update data
    const updateData: Record<string, unknown> = {};

    if (data.subject !== undefined) updateData.subject = data.subject;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.priority !== undefined) updateData.priority = data.priority;
    if (data.category !== undefined) updateData.category = data.category;
    if (data.assignedToId !== undefined) updateData.assignedToId = data.assignedToId;
    if (data.resolution !== undefined) updateData.resolution = data.resolution;
    if (data.resolvedAt !== undefined) {
      updateData.resolvedAt = new Date(data.resolvedAt);
      updateData.resolvedById = auth.userId;
    }
    if (data.closedAt !== undefined) updateData.closedAt = new Date(data.closedAt);
    if (data.satisfactionScore !== undefined) updateData.satisfactionScore = data.satisfactionScore;
    if (data.satisfactionFeedback !== undefined) updateData.satisfactionFeedback = data.satisfactionFeedback;

    // Update ticket
    const ticket = await prisma.ticket.update({
      where: { id },
      data: updateData,
      include: {
        account: { select: { id: true, name: true } },
        contact: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    // Trigger TICKET_ESCALATION playbooks if applicable
    if (isEscalatingToUrgent) {
      // Run in background, don't block the response
      triggerTicketEscalationPlaybooks(auth.orgId, existing.accountId, id).catch((error) => {
        console.error("Failed to trigger TICKET_ESCALATION playbooks:", error);
      });
    }

    // Create activity for status changes
    if (data.status && data.status !== existing.status) {
      await prisma.activity.create({
        data: {
          orgId: auth.orgId,
          type: data.status === "RESOLVED" ? "TICKET_RESOLVED" : "TICKET_CREATED",
          subject: `Ticket #${ticket.ticketNumber} ${data.status.toLowerCase()}`,
          description: ticket.subject,
          workspace: "cs",
          accountId: ticket.accountId,
          contactId: ticket.contactId,
          performedById: auth.userId,
          performedByType: "USER",
        },
      });
    }

    // Create activity for escalation
    if (isEscalatingToUrgent) {
      await prisma.activity.create({
        data: {
          orgId: auth.orgId,
          type: "TICKET_CREATED",
          subject: `Ticket #${ticket.ticketNumber} escalated to URGENT`,
          description: ticket.subject,
          workspace: "cs",
          accountId: ticket.accountId,
          contactId: ticket.contactId,
          performedById: auth.userId,
          performedByType: "USER",
        },
      });
    }

    // Audit log
    await createAuditLog({
      orgId: auth.orgId,
      action: "UPDATE",
      module: "TICKET",
      recordId: ticket.id,
      actorType: "USER",
      actorId: auth.userId,
      previousState: existing as unknown as Record<string, unknown>,
      newState: ticket as unknown as Record<string, unknown>,
    });

    return NextResponse.json(ticket);
  } catch (error) {
    console.error("Error updating ticket:", error);
    return NextResponse.json(
      { error: "Failed to update ticket" },
      { status: 500 }
    );
  }
}

// DELETE /api/cs/tickets/[id] - Delete ticket
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await getApiAuthContext();
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const existing = await prisma.ticket.findFirst({
      where: { id, orgId: auth.orgId },
    });

    if (!existing) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    await prisma.ticket.delete({ where: { id } });

    // Audit log
    await createAuditLog({
      orgId: auth.orgId,
      action: "DELETE",
      module: "TICKET",
      recordId: id,
      actorType: "USER",
      actorId: auth.userId,
      previousState: existing as unknown as Record<string, unknown>,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting ticket:", error);
    return NextResponse.json(
      { error: "Failed to delete ticket" },
      { status: 500 }
    );
  }
}
