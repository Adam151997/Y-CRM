import { notFound } from "next/navigation";
import Link from "next/link";
import { getAuthContext } from "@/lib/auth";
import prisma from "@/lib/db";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import { RecordForm } from "../../_components/record-form";

interface EditRecordPageProps {
  params: Promise<{ slug: string; id: string }>;
}

export default async function EditRecordPage({ params }: EditRecordPageProps) {
  const { orgId } = await getAuthContext();
  const { slug, id } = await params;

  // Get the module with fields
  const module = await prisma.customModule.findFirst({
    where: {
      orgId,
      slug,
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

  // Get the record
  const record = await prisma.customModuleRecord.findFirst({
    where: {
      id,
      orgId,
      moduleId: module.id,
    },
  });

  if (!record) {
    notFound();
  }

  const data = record.data as Record<string, unknown>;
  const labelValue = String(data[module.labelField] || "Untitled");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href={`/modules/${slug}/${id}`}>
          <Button variant="ghost" size="sm">
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Edit {labelValue}</h1>
          <p className="text-muted-foreground">
            Update the {module.name.toLowerCase()} details
          </p>
        </div>
      </div>

      {/* Form */}
      <RecordForm module={module} record={record} />
    </div>
  );
}
