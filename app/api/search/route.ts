import { NextRequest, NextResponse } from "next/server";
import { getApiAuthContext } from "@/lib/auth";
import { keywordSearch } from "@/lib/embeddings";
import prisma from "@/lib/db";

/**
 * POST /api/search
 * Search across CRM entities using keyword matching
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await getApiAuthContext();
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { query, entityTypes, limit = 10 } = body;

    if (!query || typeof query !== "string") {
      return NextResponse.json(
        { error: "Query string required" },
        { status: 400 }
      );
    }

    // Perform keyword search
    const results = await keywordSearch({
      orgId: auth.orgId,
      query,
      entityTypes,
      limit,
    });

    // Fetch full entity data for each result
    const enrichedResults = await Promise.all(
      results.map(async (result) => {
        let entity = null;

        switch (result.entityType) {
          case "LEAD":
            entity = await prisma.lead.findUnique({
              where: { id: result.entityId },
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                company: true,
                status: true,
              },
            });
            break;

          case "CONTACT":
            entity = await prisma.contact.findUnique({
              where: { id: result.entityId },
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                title: true,
                account: { select: { name: true } },
              },
            });
            break;

          case "ACCOUNT":
            entity = await prisma.account.findUnique({
              where: { id: result.entityId },
              select: {
                id: true,
                name: true,
                industry: true,
                type: true,
              },
            });
            break;

          case "NOTE":
            entity = await prisma.note.findUnique({
              where: { id: result.entityId },
              select: {
                id: true,
                content: true,
                createdAt: true,
                lead: { select: { firstName: true, lastName: true } },
                contact: { select: { firstName: true, lastName: true } },
                account: { select: { name: true } },
              },
            });
            break;
        }

        return {
          ...result,
          entity,
        };
      })
    );

    // Filter out results where entity was not found (deleted)
    const validResults = enrichedResults.filter((r) => r.entity !== null);

    return NextResponse.json({
      success: true,
      query,
      count: validResults.length,
      results: validResults,
    });
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json(
      { error: "Search failed" },
      { status: 500 }
    );
  }
}
