import { getAuthContext } from "@/lib/auth";
import prisma from "@/lib/db";
import { OpportunityForm } from "@/components/forms";

export default async function NewOpportunityPage() {
  const { orgId } = await getAuthContext();

  // Fetch accounts and stages for the form
  const [accounts, stages] = await Promise.all([
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

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">New Opportunity</h2>
        <p className="text-muted-foreground">
          Create a new sales opportunity
        </p>
      </div>

      {accounts.length === 0 ? (
        <div className="text-center py-12 bg-muted/50 rounded-lg">
          <p className="text-muted-foreground">
            You need to create an account first before adding opportunities.
          </p>
          <a href="/accounts/new" className="text-primary hover:underline mt-2 inline-block">
            Create an account
          </a>
        </div>
      ) : (
        <OpportunityForm accounts={accounts} stages={stages} />
      )}
    </div>
  );
}
