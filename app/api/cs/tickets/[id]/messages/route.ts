import { NextRequest, NextResponse } from "next/server";
import { getApiAuthContext } from "@/lib/auth";
import prisma from "@/lib/db";
import { createAuditLog } from "@/lib/audit";
import { clerkClient } from "@clerk/nextjs/server";
import { z } from "zod";

const attachmentSchema = z.object({
  name: z.string(),
  url: z.string(),
  size: z.number(),
  type: z.string(),
});

const createMessageSchema = z.object({
  content: z.string().min(1),
  isInternal: z.boolean().default(true),
  attachments: z.array(attachmentSchema).optional(),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/cs/tickets/[id]/messages - Get ticket messages
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await getApiAuthContext();
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Verify ticket exists and belongs to org
    const ticket = await prisma.ticket.findFirst({
      where: { id, orgId: auth.orgId },
    });

    if (!ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    const messages = await prisma.ticketMessage.findMany({
      where: { ticketId: id },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ messages });
  } catch (error) {
    console.error("Error fetching messages:", error);
    return NextResponse.json(
      { error: "Failed to fetch messages" },
      { status: 500 }
    );
  }
}

// POST /api/cs/tickets/[id]/messages - Add message to ticket
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await getApiAuthContext();
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    const validationResult = createMessageSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validationResult.error.format() },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    // Verify ticket exists and belongs to org
    const ticket = await prisma.ticket.findFirst({
      where: { id, orgId: auth.orgId },
    });

    if (!ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    // Get author name from Clerk
    let authorName = null;
    try {
      const client = await clerkClient();
      const user = await client.users.getUser(auth.userId);
      authorName = `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.emailAddresses[0]?.emailAddress || null;
    } catch {
      // Ignore error, author name is optional
    }

    // Create message
    const message = await prisma.ticketMessage.create({
      data: {
        ticketId: id,
        content: data.content,
        isInternal: data.isInternal,
        authorId: auth.userId,
        authorType: "USER",
        authorName,
        attachments: data.attachments || [],
      },
    });

    // Update ticket status and first response time
    const updateData: Record<string, unknown> = {};
    
    // If ticket is NEW and this is a non-internal message, update status and first response
    if (ticket.status === "NEW" && !data.isInternal) {
      updateData.status = "OPEN";
      if (!ticket.firstResponseAt) {
        updateData.firstResponseAt = new Date();
      }
    }

    if (Object.keys(updateData).length > 0) {
      await prisma.ticket.update({
        where: { id },
        data: updateData,
      });
    }

    // Audit log
    await createAuditLog({
      orgId: auth.orgId,
      action: "CREATE",
      module: "TICKET_MESSAGE",
      recordId: message.id,
      actorType: "USER",
      actorId: auth.userId,
      newState: message as unknown as Record<string, unknown>,
      metadata: { ticketId: id, isInternal: data.isInternal },
    });

    return NextResponse.json({ message }, { status: 201 });
  } catch (error) {
    console.error("Error creating message:", error);
    return NextResponse.json(
      { error: "Failed to create message" },
      { status: 500 }
    );
  }
}
