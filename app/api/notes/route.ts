import { NextRequest, NextResponse } from "next/server";
import { getApiAuthContext } from "@/lib/auth";
import prisma from "@/lib/db";
import { createAuditLog } from "@/lib/audit";
import { z } from "zod";

const attachmentSchema = z.object({
  name: z.string(),
  url: z.string().url(),
  size: z.number(),
  type: z.string(),
});

const createNoteSchema = z.object({
  content: z.string().min(1, "Note content is required").max(10000),
  leadId: z.string().uuid().optional().nullable(),
  contactId: z.string().uuid().optional().nullable(),
  accountId: z.string().uuid().optional().nullable(),
  opportunityId: z.string().uuid().optional().nullable(),
  attachments: z.array(attachmentSchema).optional().default([]),
});

// POST /api/notes - Create a new note
export async function POST(request: NextRequest) {
  try {
    const auth = await getApiAuthContext();
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    // Validate
    const validationResult = createNoteSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validationResult.error.format() },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    // Ensure at least one relation is set
    if (!data.leadId && !data.contactId && !data.accountId && !data.opportunityId) {
      return NextResponse.json(
        { error: "Note must be associated with a lead, contact, account, or opportunity" },
        { status: 400 }
      );
    }

    // Create note
    const note = await prisma.note.create({
      data: {
        orgId: auth.orgId,
        content: data.content,
        attachments: data.attachments,
        leadId: data.leadId,
        contactId: data.contactId,
        accountId: data.accountId,
        opportunityId: data.opportunityId,
        createdById: auth.userId,
        createdByType: "USER",
      },
    });

    // Audit log
    await createAuditLog({
      orgId: auth.orgId,
      action: "CREATE",
      module: "NOTE",
      recordId: note.id,
      actorType: "USER",
      actorId: auth.userId,
      newState: note as unknown as Record<string, unknown>,
    });

    return NextResponse.json(note, { status: 201 });
  } catch (error) {
    console.error("Error creating note:", error);
    return NextResponse.json(
      { error: "Failed to create note" },
      { status: 500 }
    );
  }
}

// GET /api/notes - Get notes (with filtering)
export async function GET(request: NextRequest) {
  try {
    const auth = await getApiAuthContext();
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const leadId = searchParams.get("leadId");
    const contactId = searchParams.get("contactId");
    const accountId = searchParams.get("accountId");
    const opportunityId = searchParams.get("opportunityId");

    const where: Record<string, unknown> = { orgId: auth.orgId };
    if (leadId) where.leadId = leadId;
    if (contactId) where.contactId = contactId;
    if (accountId) where.accountId = accountId;
    if (opportunityId) where.opportunityId = opportunityId;

    const notes = await prisma.note.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return NextResponse.json(notes);
  } catch (error) {
    console.error("Error fetching notes:", error);
    return NextResponse.json(
      { error: "Failed to fetch notes" },
      { status: 500 }
    );
  }
}
