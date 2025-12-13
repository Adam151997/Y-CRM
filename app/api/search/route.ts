import { NextRequest, NextResponse } from "next/server";
import { getApiAuthContext } from "@/lib/auth";
import prisma from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * GET /api/search
 * Omni-search across all CRM modules
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await getApiAuthContext();
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q")?.trim();
    const limit = Math.min(parseInt(searchParams.get("limit") || "5"), 10);

    if (!query || query.length < 2) {
      return NextResponse.json({ results: [] });
    }

    // Search all modules in parallel
    const [
      leads,
      contacts,
      accounts,
      opportunities,
      tasks,
      tickets,
      documents,
      invoices,
      renewals,
      campaigns,
      customModules,
    ] = await Promise.all([
      // Leads
      prisma.lead.findMany({
        where: {
          orgId: auth.orgId,
          OR: [
            { firstName: { contains: query, mode: "insensitive" } },
            { lastName: { contains: query, mode: "insensitive" } },
            { email: { contains: query, mode: "insensitive" } },
            { company: { contains: query, mode: "insensitive" } },
            { phone: { contains: query, mode: "insensitive" } },
          ],
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          company: true,
          status: true,
        },
        take: limit,
        orderBy: { updatedAt: "desc" },
      }),

      // Contacts
      prisma.contact.findMany({
        where: {
          orgId: auth.orgId,
          OR: [
            { firstName: { contains: query, mode: "insensitive" } },
            { lastName: { contains: query, mode: "insensitive" } },
            { email: { contains: query, mode: "insensitive" } },
            { phone: { contains: query, mode: "insensitive" } },
          ],
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          account: { select: { name: true } },
        },
        take: limit,
        orderBy: { updatedAt: "desc" },
      }),

      // Accounts
      prisma.account.findMany({
        where: {
          orgId: auth.orgId,
          OR: [
            { name: { contains: query, mode: "insensitive" } },
            { industry: { contains: query, mode: "insensitive" } },
            { website: { contains: query, mode: "insensitive" } },
          ],
        },
        select: {
          id: true,
          name: true,
          industry: true,
          type: true,
        },
        take: limit,
        orderBy: { updatedAt: "desc" },
      }),

      // Opportunities
      prisma.opportunity.findMany({
        where: {
          orgId: auth.orgId,
          OR: [
            { name: { contains: query, mode: "insensitive" } },
          ],
        },
        select: {
          id: true,
          name: true,
          value: true,
          account: { select: { name: true } },
          stage: { select: { name: true } },
        },
        take: limit,
        orderBy: { updatedAt: "desc" },
      }),

      // Tasks
      prisma.task.findMany({
        where: {
          orgId: auth.orgId,
          OR: [
            { title: { contains: query, mode: "insensitive" } },
            { description: { contains: query, mode: "insensitive" } },
          ],
        },
        select: {
          id: true,
          title: true,
          status: true,
          priority: true,
          dueDate: true,
        },
        take: limit,
        orderBy: { updatedAt: "desc" },
      }),

      // Tickets
      prisma.ticket.findMany({
        where: {
          orgId: auth.orgId,
          OR: [
            { subject: { contains: query, mode: "insensitive" } },
            { description: { contains: query, mode: "insensitive" } },
          ],
        },
        select: {
          id: true,
          ticketNumber: true,
          subject: true,
          status: true,
          priority: true,
        },
        take: limit,
        orderBy: { updatedAt: "desc" },
      }),

      // Documents
      prisma.document.findMany({
        where: {
          orgId: auth.orgId,
          name: { contains: query, mode: "insensitive" },
        },
        select: {
          id: true,
          name: true,
          type: true,
          mimeType: true,
        },
        take: limit,
        orderBy: { createdAt: "desc" },
      }),

      // Invoices
      prisma.invoice.findMany({
        where: {
          orgId: auth.orgId,
          OR: [
            { invoiceNumber: { contains: query, mode: "insensitive" } },
          ],
        },
        select: {
          id: true,
          invoiceNumber: true,
          status: true,
          total: true,
          account: { select: { name: true } },
        },
        take: limit,
        orderBy: { createdAt: "desc" },
      }),

      // Renewals
      prisma.renewal.findMany({
        where: {
          orgId: auth.orgId,
          OR: [
            { contractName: { contains: query, mode: "insensitive" } },
          ],
        },
        select: {
          id: true,
          contractName: true,
          contractValue: true,
          status: true,
          endDate: true,
          account: { select: { name: true } },
        },
        take: limit,
        orderBy: { endDate: "asc" },
      }),

      // Campaigns
      prisma.campaign.findMany({
        where: {
          orgId: auth.orgId,
          OR: [
            { name: { contains: query, mode: "insensitive" } },
            { subject: { contains: query, mode: "insensitive" } },
          ],
        },
        select: {
          id: true,
          name: true,
          type: true,
          status: true,
        },
        take: limit,
        orderBy: { createdAt: "desc" },
      }),

      // Custom Module Records - search across all custom modules
      prisma.customModuleRecord.findMany({
        where: {
          orgId: auth.orgId,
        },
        select: {
          id: true,
          data: true,
          module: { select: { id: true, name: true, slug: true } },
        },
        take: limit * 2, // Get more to filter
        orderBy: { createdAt: "desc" },
      }),
    ]);

    // Format results
    const results = [
      ...leads.map((lead) => ({
        id: lead.id,
        type: "lead" as const,
        title: `${lead.firstName} ${lead.lastName}`,
        subtitle: lead.company || lead.email || "",
        status: lead.status,
        href: `/leads/${lead.id}`,
      })),
      ...contacts.map((contact) => ({
        id: contact.id,
        type: "contact" as const,
        title: `${contact.firstName} ${contact.lastName}`,
        subtitle: contact.account?.name || contact.email || "",
        href: `/contacts/${contact.id}`,
      })),
      ...accounts.map((account) => ({
        id: account.id,
        type: "account" as const,
        title: account.name,
        subtitle: account.industry || account.type || "",
        href: `/accounts/${account.id}`,
      })),
      ...opportunities.map((opp) => ({
        id: opp.id,
        type: "opportunity" as const,
        title: opp.name,
        subtitle: `${opp.account?.name || ""} • ${opp.stage?.name || ""}`,
        value: opp.value,
        href: `/opportunities/${opp.id}`,
      })),
      ...tasks.map((task) => ({
        id: task.id,
        type: "task" as const,
        title: task.title,
        subtitle: task.status,
        priority: task.priority,
        href: `/tasks/${task.id}`,
      })),
      ...tickets.map((ticket) => ({
        id: ticket.id,
        type: "ticket" as const,
        title: `#${ticket.ticketNumber} ${ticket.subject}`,
        subtitle: ticket.status,
        priority: ticket.priority,
        href: `/tickets/${ticket.id}`,
      })),
      ...documents.map((doc) => ({
        id: doc.id,
        type: "document" as const,
        title: doc.name,
        subtitle: doc.type,
        href: `/documents/${doc.id}`,
      })),
      ...invoices.map((invoice) => ({
        id: invoice.id,
        type: "invoice" as const,
        title: `Invoice ${invoice.invoiceNumber}`,
        subtitle: invoice.account?.name || `${Number(invoice.total).toLocaleString()}`,
        status: invoice.status,
        href: `/sales/invoices/${invoice.id}`,
      })),
      ...renewals.map((renewal) => ({
        id: renewal.id,
        type: "renewal" as const,
        title: renewal.contractName || `Renewal - ${renewal.account?.name}`,
        subtitle: `${renewal.account?.name || ""} • ${renewal.status}`,
        status: renewal.status,
        href: `/cs/renewals/${renewal.id}`,
      })),
      ...campaigns.map((campaign) => ({
        id: campaign.id,
        type: "campaign" as const,
        title: campaign.name,
        subtitle: `${campaign.type} • ${campaign.status}`,
        status: campaign.status,
        href: `/marketing/campaigns/${campaign.id}`,
      })),
      // Filter custom module records that match the query
      ...customModules
        .filter((record) => {
          // Search within the data JSON for matching values
          const dataStr = JSON.stringify(record.data).toLowerCase();
          return dataStr.includes(query.toLowerCase());
        })
        .slice(0, limit)
        .map((record) => {
          // Try to extract a title from common fields
          const data = record.data as Record<string, unknown>;
          const title = (data.name || data.title || data.label || `${record.module.name} Record`) as string;
          return {
            id: record.id,
            type: "custom" as const,
            title: String(title),
            subtitle: record.module.name,
            href: `/custom/${record.module.slug}/${record.id}`,
          };
        }),
    ];

    return NextResponse.json({ results, query });
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json(
      { error: "Search failed" },
      { status: 500 }
    );
  }
}
