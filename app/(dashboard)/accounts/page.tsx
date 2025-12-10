import { Suspense } from "react";
import Link from "next/link";
import { getAuthContext } from "@/lib/auth";
import prisma from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { AccountsTable } from "./_components/accounts-table";
import { AccountsFilters } from "./_components/accounts-filters";

interface AccountsPageProps {
  searchParams: Promise<{
    page?: string;
    type?: string;
    industry?: string;
    rating?: string;
    query?: string;
    sortBy?: string;
    sortOrder?: string;
  }>;
}

export default async function AccountsPage({ searchParams }: AccountsPageProps) {
  const { orgId } = await getAuthContext();
  const params = await searchParams;

  const page = parseInt(params.page || "1");
  const limit = 20;
  const sortBy = params.sortBy || "createdAt";
  const sortOrder = (params.sortOrder || "desc") as "asc" | "desc";

  // Build where clause
  const where: Record<string, unknown> = { orgId };
  if (params.type) where.type = params.type;
  if (params.industry) where.industry = params.industry;
  if (params.rating) where.rating = params.rating;
  if (params.query) {
    where.OR = [
      { name: { contains: params.query, mode: "insensitive" } },
      { website: { contains: params.query, mode: "insensitive" } },
      { industry: { contains: params.query, mode: "insensitive" } },
    ];
  }

  // Fetch accounts
  const [accounts, total] = await Promise.all([
    prisma.account.findMany({
      where,
      orderBy: { [sortBy]: sortOrder },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        _count: {
          select: { contacts: true, opportunities: true, notes: true },
        },
      },
    }),
    prisma.account.count({ where }),
  ]);

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Accounts</h2>
          <p className="text-muted-foreground">
            Manage your companies and organizations
          </p>
        </div>
        <Button asChild>
          <Link href="/accounts/new">
            <Plus className="h-4 w-4 mr-2" />
            Add Account
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <AccountsFilters
        currentType={params.type}
        currentIndustry={params.industry}
        currentRating={params.rating}
        currentQuery={params.query}
      />

      {/* Table */}
      <Suspense fallback={<div>Loading accounts...</div>}>
        <AccountsTable
          accounts={accounts}
          page={page}
          totalPages={totalPages}
          total={total}
        />
      </Suspense>
    </div>
  );
}
