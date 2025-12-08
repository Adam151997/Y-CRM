import { notFound } from "next/navigation";
import Link from "next/link";
import { getAuthContext } from "@/lib/auth";
import prisma from "@/lib/db";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import { RecordForm } from "../_components/record-form";

interface NewRecordPageProps {
  params: Promise<{ slug: string }>;
}

export default async function NewRecordPage({ params }: NewRecordPageProps) {
  const { orgId } = await getAuthContext();
  const { slug } = await params;

  // Get the module with fields
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href={`/modules/${slug}`}>
          <Button variant="ghost" size="sm">
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">New {module.name}</h1>
          <p className="text-muted-foreground">
            Create a new {module.name.toLowerCase()} record
          </p>
        </div>
      </div>

      {/* Form */}
      <RecordForm module={module} />
    </div>
  );
}
