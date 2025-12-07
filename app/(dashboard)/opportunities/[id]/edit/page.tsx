import { notFound } from "next/navigation";
import { getAuthContext } from "@/lib/auth";
import prisma from "@/lib/db";
import { OpportunityForm } from "@/components/forms";

interface EditOpportunityPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditOpportunityPage({ params }: EditOpportunityPageProps) {
  const { orgId } = await getAuthContext();
  const { id } = await params;

  const [opportunity, accounts, stages] = await Promise.all([
    prisma.opportunity.findFirst({
      where: { id, orgId },
    }),
    prisma.account.findMany({
      where: { orgId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.pipelineStage.findMany({
      where: { orgId, module: "OPPORTUNITY", isWon: false, isLost: false },
      orderBy: { order: "asc" },
    }),
  ]);

  if (!opportunity) {
    notFound();
  }

  // Convert for the form
  const formData = {
    id: opportunity.id,
    name: opportunity.name,
    value: Number(opportunity.value),
    currency: opportunity.currency,
    probability: opportunity.probability,
    accountId: opportunity.accountId,
    stageId: opportunity.stageId,
    expectedCloseDate: opportunity.expectedCloseDate,
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Edit Opportunity</h2>
        <p className="text-muted-foreground">Update opportunity details</p>
      </div>

      <OpportunityForm accounts={accounts} stages={stages} initialData={formData} />
    </div>
  );
}
