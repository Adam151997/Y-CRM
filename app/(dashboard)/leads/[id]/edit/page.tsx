import { notFound } from "next/navigation";
import Link from "next/link";
import { getAuthContext } from "@/lib/auth";
import prisma from "@/lib/db";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { LeadForm } from "@/components/forms/lead-form";

interface EditLeadPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditLeadPage({ params }: EditLeadPageProps) {
  const { orgId } = await getAuthContext();
  const { id } = await params;

  const [lead, pipelineStages] = await Promise.all([
    prisma.lead.findFirst({
      where: { id, orgId },
    }),
    prisma.pipelineStage.findMany({
      where: { orgId, module: "LEAD" },
      orderBy: { order: "asc" },
    }),
  ]);

  if (!lead) {
    notFound();
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/leads/${id}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">
            Edit {lead.firstName} {lead.lastName}
          </h1>
          <p className="text-muted-foreground">
            Update lead information
          </p>
        </div>
      </div>

      {/* Form */}
      <LeadForm
        pipelineStages={pipelineStages}
        leadId={lead.id}
        mode="edit"
        defaultValues={{
          firstName: lead.firstName,
          lastName: lead.lastName,
          email: lead.email || "",
          phone: lead.phone || "",
          company: lead.company || "",
          title: lead.title || "",
          source: lead.source || "",
          status: lead.status,
          pipelineStageId: lead.pipelineStageId || "",
          assignedToId: lead.assignedToId || null,
        }}
        defaultCustomFields={(lead.customFields as Record<string, unknown>) || {}}
      />
    </div>
  );
}
