import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";
import prisma from "@/lib/db";

// GET /api/marketing/segments/[id]/members - Get segment members with details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { orgId } = await getAuthContext();
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "20");

    // Fetch segment with members
    const segment = await prisma.segment.findFirst({
      where: { id, orgId },
      select: {
        id: true,
        targetEntity: true,
        members: {
          take: limit,
          orderBy: { addedAt: "desc" },
          select: {
            id: true,
            contactId: true,
            leadId: true,
            addedAt: true,
          },
        },
      },
    });

    if (!segment) {
      return NextResponse.json(
        { error: "Segment not found" },
        { status: 404 }
      );
    }

    // Fetch actual entity details based on target type
    let members: Array<{
      id: string;
      firstName: string;
      lastName: string;
      email: string | null;
      company?: string | null;
      status?: string;
      account?: { name: string } | null;
    }> = [];

    if (segment.targetEntity === "CONTACT") {
      const contactIds = segment.members
        .map((m) => m.contactId)
        .filter((id): id is string => id !== null);

      if (contactIds.length > 0) {
        const contacts = await prisma.contact.findMany({
          where: { id: { in: contactIds }, orgId },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            account: {
              select: { name: true },
            },
          },
        });

        members = contacts.map((c) => ({
          id: c.id,
          firstName: c.firstName,
          lastName: c.lastName,
          email: c.email,
          account: c.account,
        }));
      }
    } else {
      const leadIds = segment.members
        .map((m) => m.leadId)
        .filter((id): id is string => id !== null);

      if (leadIds.length > 0) {
        const leads = await prisma.lead.findMany({
          where: { id: { in: leadIds }, orgId },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            company: true,
            status: true,
          },
        });

        members = leads.map((l) => ({
          id: l.id,
          firstName: l.firstName,
          lastName: l.lastName,
          email: l.email,
          company: l.company,
          status: l.status,
        }));
      }
    }

    return NextResponse.json({
      members,
      targetEntity: segment.targetEntity,
    });
  } catch (error) {
    console.error("Error fetching segment members:", error);
    return NextResponse.json(
      { error: "Failed to fetch segment members" },
      { status: 500 }
    );
  }
}
