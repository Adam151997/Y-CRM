import { Suspense } from "react";
import Link from "next/link";
import { getAuthContext } from "@/lib/auth";
import prisma from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { OpportunitiesTable } from "./_components/opportunities-table";
import { OpportunitiesFilters } from "./_components/opportunities-filters";
import { OpportunitiesSummary } from "./_components/opportunities-summary";

interface OpportunitiesPageProps {
  searchParams: Promise<{
    page?: string;
    stageId?: string;
    accountId?: string;
    query?: string;
    sortBy?: string;
    sortOrder?: string;
  }>;
}

export default async function OpportunitiesPage({ searchParams }: OpportunitiesPageProps) {
  const { orgId } = await getAuthContext();
  const params = await searchParams;

  const page = parseInt(params.page || "1");
  const limit = 20;
  const sortBy = params.sortBy || "createdAt";
  const sortOrder = (params.sortOrder || "desc") as "asc" | "desc";

  // Build where clause
  const where: Record<string, unknown> = { orgId };
  if (params.stageId) where.stageId = params.stageId;
  if (params.accountId) where.accountId = params.accountId;
  if (params.query) {
    where.OR = [
      { name: { contains: params.query, mode: "insensitive" } },
      { account: { name: { contains: params.query, mode: "insensitive" } } },
    ];
  }

  // Fetch opportunities, stages, and accounts
  const [opportunities, total, stages, accounts, summary] = await Promise.all([
    prisma.opportunity.findMany({
      where,
      orderBy: { [sortBy]: sortOrder },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        account: {
          select: { id: true, name: true },
        },
        stage: true,
        _count: {
          select: { notes: true, tasks: true },
        },
      },
    }),
    prisma.opportunity.count({ where }),
    prisma.pipelineStage.findMany({
      where: { orgId, module: "OPPORTUNITY" },
      orderBy: { order: "asc" },
    }),
    prisma.account.findMany({
      where: { orgId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    // Get summary stats
    prisma.opportunity.aggregate({
      where: { orgId, closedWon: null },
      _sum: { value: true },
      _count: true,
    }),
  ]);

  const totalPages = Math.ceil(total / limit);

  // Calculate weighted pipeline
  const openOpportunities = await prisma.opportunity.findMany({
    where: { orgId, closedWon: null },
    select: { value: true, probability: true },
  });
  
  const weightedPipeline = openOpportunities.reduce(
    (acc, opp) => acc + Number(opp.value) * (opp.probability / 100),
    0
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Opportunities</h2>
          <p className="text-muted-foreground">
            Track and manage your sales pipeline
          </p>
        </div>
        <Button asChild>
          <Link href="/opportunities/new">
            <Plus className="h-4 w-4 mr-2" />
            New Opportunity
          </Link>
        </Button>
      </div>

      {/* Summary Cards */}
      <OpportunitiesSummary
        totalValue={Number(summary._sum.value || 0)}
        weightedValue={weightedPipeline}
        count={summary._count}
      />

      {/* Filters */}
      <OpportunitiesFilters
        stages={stages}
        accounts={accounts}
        currentStageId={params.stageId}
        currentAccountId={params.accountId}
        currentQuery={params.query}
      />

      {/* Table */}
      <Suspense fallback={<div>Loading opportunities...</div>}>
        <OpportunitiesTable
          opportunities={opportunities}
          stages={stages}
          page={page}
          totalPages={totalPages}
          total={total}
        />
      </Suspense>
    </div>
  );
}
