import { notFound } from "next/navigation";
import Link from "next/link";
import { getAuthContext } from "@/lib/auth";
import prisma from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { RecordsList } from "./_components/records-list";

interface ModulePageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{
    page?: string;
    query?: string;
  }>;
}

export default async function CustomModulePage({
  params,
  searchParams,
}: ModulePageProps) {
  const { orgId } = await getAuthContext();
  const { slug } = await params;
  const { page: pageParam, query } = await searchParams;

  // Get the module
  const module = await prisma.customModule.findFirst({
    where: {
      orgId,
      slug,
      isActive: true,
    },
    include: {
      fields: {
        where: { isActive: true },
        orderBy: { displayOrder: "asc" },
      },
    },
  });

  if (!module) {
    notFound();
  }

  // Pagination
  const page = parseInt(pageParam || "1");
  const limit = 20;

  // Build where clause
  const where: Record<string, unknown> = {
    orgId,
    moduleId: module.id,
  };

  // Search in JSON data (simple implementation)
  // Note: For production, consider using Prisma's JSON filtering or full-text search
  const records = await prisma.customModuleRecord.findMany({
    where,
    orderBy: { createdAt: "desc" },
    skip: (page - 1) * limit,
    take: limit,
  });

  const total = await prisma.customModuleRecord.count({ where });

  // Filter by query if provided (client-side for now)
  const filteredRecords = query
    ? records.filter((record) => {
        const data = record.data as Record<string, unknown>;
        const labelValue = String(data[module.labelField] || "");
        return labelValue.toLowerCase().includes(query.toLowerCase());
      })
    : records;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{module.pluralName}</h1>
          {module.description && (
            <p className="text-muted-foreground">{module.description}</p>
          )}
        </div>
        <Link href={`/modules/${slug}/new`}>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New {module.name}
          </Button>
        </Link>
      </div>

      {/* Records List */}
      <RecordsList
        module={module}
        records={filteredRecords}
        total={query ? filteredRecords.length : total}
        page={page}
        limit={limit}
        query={query}
      />
    </div>
  );
}
