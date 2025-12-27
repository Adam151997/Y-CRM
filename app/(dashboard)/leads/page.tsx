import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { getAuthContext } from "@/lib/auth";
import prisma from "@/lib/db";
import { getCachedLeadStages } from "@/lib/cache";
import { LeadsTable } from "./_components/leads-table";
import { LeadsFilters } from "./_components/leads-filters";
import { AddLeadButton } from "./_components/add-lead-button";

interface LeadsPageProps {
  searchParams: Promise<{
    page?: string;
    status?: string;
    source?: string;
    query?: string;
    sortBy?: string;
    sortOrder?: string;
    owner?: string;
  }>;
}

export default async function LeadsPage({ searchParams }: LeadsPageProps) {
  const { orgId, userId } = await getAuthContext();
  const t = await getTranslations("modules.leads");
  const params = await searchParams;

  const page = parseInt(params.page || "1");
  const limit = 20;
  const sortBy = params.sortBy || "createdAt";
  const sortOrder = (params.sortOrder || "desc") as "asc" | "desc";

  // Build where clause
  const where: Record<string, unknown> = { orgId };
  if (params.status) where.status = params.status;
  if (params.source) where.source = params.source;
  
  // Owner filter
  if (params.owner) {
    if (params.owner === "_my") {
      where.assignedToId = userId;
    } else if (params.owner === "_unassigned") {
      where.assignedToId = null;
    } else {
      where.assignedToId = params.owner;
    }
  }
  
  if (params.query) {
    where.OR = [
      { firstName: { contains: params.query, mode: "insensitive" } },
      { lastName: { contains: params.query, mode: "insensitive" } },
      { email: { contains: params.query, mode: "insensitive" } },
      { company: { contains: params.query, mode: "insensitive" } },
    ];
  }

  // Fetch leads and pipeline stages in parallel
  const [leads, total, pipelineStages] = await Promise.all([
    prisma.lead.findMany({
      where,
      orderBy: { [sortBy]: sortOrder },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        pipelineStage: true,
        _count: {
          select: { notes: true, tasks: true },
        },
      },
    }),
    prisma.lead.count({ where }),
    getCachedLeadStages(orgId),
  ]);

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{t("title")}</h2>
          <p className="text-muted-foreground">
            {t("description")}
          </p>
        </div>
        <AddLeadButton />
      </div>

      {/* Filters */}
      <LeadsFilters 
        currentStatus={params.status}
        currentSource={params.source}
        currentQuery={params.query}
        currentOwner={params.owner}
        currentUserId={userId}
      />

      {/* Table */}
      <Suspense fallback={<div className="h-96 bg-muted/50 rounded-lg animate-pulse" />}>
        <LeadsTable
          leads={leads}
          pipelineStages={pipelineStages}
          page={page}
          totalPages={totalPages}
          total={total}
        />
      </Suspense>
    </div>
  );
}
