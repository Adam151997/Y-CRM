import { Suspense } from "react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { getAuthContext } from "@/lib/auth";
import prisma from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { ContactsTable } from "./_components/contacts-table";
import { ContactsFilters } from "./_components/contacts-filters";

interface ContactsPageProps {
  searchParams: Promise<{
    page?: string;
    accountId?: string;
    query?: string;
    sortBy?: string;
    sortOrder?: string;
    owner?: string;
  }>;
}

export default async function ContactsPage({ searchParams }: ContactsPageProps) {
  const { orgId, userId } = await getAuthContext();
  const t = await getTranslations("modules.contacts");
  const tCommon = await getTranslations("common");
  const params = await searchParams;

  const page = parseInt(params.page || "1");
  const limit = 20;
  const sortBy = params.sortBy || "createdAt";
  const sortOrder = (params.sortOrder || "desc") as "asc" | "desc";

  // Build where clause
  const where: Record<string, unknown> = { orgId };
  if (params.accountId) where.accountId = params.accountId;
  
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
      { title: { contains: params.query, mode: "insensitive" } },
    ];
  }

  // Fetch contacts and accounts for filter
  const [contacts, total, accounts] = await Promise.all([
    prisma.contact.findMany({
      where,
      orderBy: { [sortBy]: sortOrder },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        account: {
          select: { id: true, name: true },
        },
        _count: {
          select: { notes: true, tasks: true },
        },
      },
    }),
    prisma.contact.count({ where }),
    prisma.account.findMany({
      where: { orgId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
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
        <Button asChild>
          <Link href="/contacts/new">
            <Plus className="h-4 w-4 mr-2" />
            {t("addContact")}
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <ContactsFilters
        accounts={accounts}
        currentAccountId={params.accountId}
        currentQuery={params.query}
        currentOwner={params.owner}
        currentUserId={userId}
      />

      {/* Table */}
      <Suspense fallback={<div>{tCommon("loading")}</div>}>
        <ContactsTable
          contacts={contacts}
          page={page}
          totalPages={totalPages}
          total={total}
        />
      </Suspense>
    </div>
  );
}
