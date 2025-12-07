import Link from "next/link";
import { getAuthContext } from "@/lib/auth";
import prisma from "@/lib/db";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { LeadForm } from "@/components/forms/lead-form";

export default async function NewLeadPage() {
  const { orgId } = await getAuthContext();

  const pipelineStages = await prisma.pipelineStage.findMany({
    where: { orgId, module: "LEAD" },
    orderBy: { order: "asc" },
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/leads">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Add New Lead</h1>
          <p className="text-muted-foreground">
            Create a new lead to track in your pipeline
          </p>
        </div>
      </div>

      {/* Form */}
      <LeadForm pipelineStages={pipelineStages} mode="create" />
    </div>
  );
}
