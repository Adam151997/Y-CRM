import { Suspense } from "react";
import Link from "next/link";
import { getAuthContext } from "@/lib/auth";
import prisma from "@/lib/db";
import { getCachedLeadStages } from "@/lib/cache";
import { Button } from "@/components/ui/button";
import { Plus, Upload, Download } from "lucide-react";
import { LeadsTable } from "./_components/leads-table";
import { LeadsFilters } from "./_components/leads-filters";

interface LeadsPageProps {
  searchParams: Promise<{
    page?: string;
    status?: string;
    source?: string;
    query?: string;
    sortBy?: string;
    sortOrder?: string;
  }>;
}

export default async function LeadsPage({ searchParams }: LeadsPageProps) {
  const { orgId } = await getAuthContext();
  const params = await searchParams;

  const page = parseInt(params.page || "1");
  const limit = 20;
  const sortBy = params.sortBy || "createdAt";
  const sortOrder = (params.sortOrder || "desc") as "asc" | "desc";

  // Build where clause
  const where: Record<string, unknown> = { orgId };
  if (params.status) where.status = params.status;
  if (params.source) where.source = params.source;
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
          <h2 className="text-2xl font-bold tracking-tight">Leads</h2>
          <p className="text-muted-foreground">
            Manage and track your sales leads
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Upload className="h-4 w-4 mr-2" />
            Import
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button asChild>
            <Link href="/leads/new">
              <Plus className="h-4 w-4 mr-2" />
              Add Lead
            </Link>
          </Button>
        </div>
      </div>

      {/* Filters */}
      <LeadsFilters 
        currentStatus={params.status}
        currentSource={params.source}
        currentQuery={params.query}
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
