import prisma from "@/lib/db";

/**
 * Full-text search across CRM entities
 * Uses PostgreSQL ILIKE for keyword matching (no pgvector required)
 */
export async function keywordSearch(params: {
  orgId: string;
  query: string;
  entityTypes?: string[];
  limit?: number;
}): Promise<Array<{
  entityType: string;
  entityId: string;
  matchedField: string;
  preview: string;
}>> {
  const {
    orgId,
    query,
    entityTypes = ["LEAD", "CONTACT", "ACCOUNT", "NOTE"],
    limit = 10,
  } = params;

  const results: Array<{
    entityType: string;
    entityId: string;
    matchedField: string;
    preview: string;
  }> = [];

  const searchTerm = `%${query}%`;

  // Search Leads
  if (entityTypes.includes("LEAD")) {
    const leads = await prisma.lead.findMany({
      where: {
        orgId,
        OR: [
          { firstName: { contains: query, mode: "insensitive" } },
          { lastName: { contains: query, mode: "insensitive" } },
          { email: { contains: query, mode: "insensitive" } },
          { company: { contains: query, mode: "insensitive" } },
          { title: { contains: query, mode: "insensitive" } },
        ],
      },
      take: limit,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        company: true,
      },
    });

    leads.forEach((lead) => {
      const matchedField = [
        lead.firstName?.toLowerCase().includes(query.toLowerCase()) && "name",
        lead.lastName?.toLowerCase().includes(query.toLowerCase()) && "name",
        lead.email?.toLowerCase().includes(query.toLowerCase()) && "email",
        lead.company?.toLowerCase().includes(query.toLowerCase()) && "company",
      ].find(Boolean) || "name";

      results.push({
        entityType: "LEAD",
        entityId: lead.id,
        matchedField,
        preview: `${lead.firstName} ${lead.lastName}${lead.company ? ` at ${lead.company}` : ""}`,
      });
    });
  }

  // Search Contacts
  if (entityTypes.includes("CONTACT")) {
    const contacts = await prisma.contact.findMany({
      where: {
        orgId,
        OR: [
          { firstName: { contains: query, mode: "insensitive" } },
          { lastName: { contains: query, mode: "insensitive" } },
          { email: { contains: query, mode: "insensitive" } },
          { title: { contains: query, mode: "insensitive" } },
        ],
      },
      take: limit,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        title: true,
      },
    });

    contacts.forEach((contact) => {
      results.push({
        entityType: "CONTACT",
        entityId: contact.id,
        matchedField: "name",
        preview: `${contact.firstName} ${contact.lastName}${contact.title ? ` - ${contact.title}` : ""}`,
      });
    });
  }

  // Search Accounts
  if (entityTypes.includes("ACCOUNT")) {
    const accounts = await prisma.account.findMany({
      where: {
        orgId,
        OR: [
          { name: { contains: query, mode: "insensitive" } },
          { industry: { contains: query, mode: "insensitive" } },
          { website: { contains: query, mode: "insensitive" } },
        ],
      },
      take: limit,
      select: {
        id: true,
        name: true,
        industry: true,
      },
    });

    accounts.forEach((account) => {
      results.push({
        entityType: "ACCOUNT",
        entityId: account.id,
        matchedField: "name",
        preview: `${account.name}${account.industry ? ` (${account.industry})` : ""}`,
      });
    });
  }

  // Search Notes
  if (entityTypes.includes("NOTE")) {
    const notes = await prisma.note.findMany({
      where: {
        orgId,
        content: { contains: query, mode: "insensitive" },
      },
      take: limit,
      select: {
        id: true,
        content: true,
      },
    });

    notes.forEach((note) => {
      results.push({
        entityType: "NOTE",
        entityId: note.id,
        matchedField: "content",
        preview: note.content.substring(0, 100) + (note.content.length > 100 ? "..." : ""),
      });
    });
  }

  return results.slice(0, limit);
}

/**
 * Semantic search placeholder - falls back to keyword search
 * When pgvector is available, this will use vector similarity
 */
export async function semanticSearch(params: {
  orgId: string;
  query: string;
  entityTypes?: string[];
  limit?: number;
  threshold?: number;
}): Promise<Array<{
  entityType: string;
  entityId: string;
  similarity: number;
  sourceText: string;
}>> {
  // Fall back to keyword search and convert results
  const keywordResults = await keywordSearch({
    orgId: params.orgId,
    query: params.query,
    entityTypes: params.entityTypes,
    limit: params.limit,
  });

  return keywordResults.map((r) => ({
    entityType: r.entityType,
    entityId: r.entityId,
    similarity: 0.8, // Mock similarity for keyword matches
    sourceText: r.preview,
  }));
}

/**
 * Check if semantic search (pgvector) is available
 */
export function isSemanticSearchAvailable(): boolean {
  // pgvector not available on current Railway instance
  return false;
}
