import { getAuthContext } from "@/lib/auth";
import prisma from "@/lib/db";
import { KanbanBoard } from "./_components/kanban-board";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default async function PipelinePage() {
  const { orgId } = await getAuthContext();

  // Fetch pipeline stages and opportunities
  const [stages, opportunities] = await Promise.all([
    prisma.pipelineStage.findMany({
      where: { orgId, module: "OPPORTUNITY" },
      orderBy: { order: "asc" },
    }),
    prisma.opportunity.findMany({
      where: { orgId },
      include: {
        account: {
          select: { id: true, name: true },
        },
        stage: true,
        _count: {
          select: { tasks: true, notes: true },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  // Group opportunities by stage
  const opportunitiesByStage = stages.reduce((acc, stage) => {
    acc[stage.id] = opportunities.filter((opp) => opp.stageId === stage.id);
    return acc;
  }, {} as Record<string, typeof opportunities>);

  // Calculate totals
  const totalValue = opportunities
    .filter((opp) => opp.closedWon === null)
    .reduce((sum, opp) => sum + Number(opp.value), 0);

  const weightedValue = opportunities
    .filter((opp) => opp.closedWon === null)
    .reduce((sum, opp) => sum + Number(opp.value) * (opp.probability / 100), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Pipeline</h2>
          <p className="text-muted-foreground">
            Drag and drop opportunities between stages
          </p>
        </div>
        <div className="flex items-center gap-6 text-sm">
          <div>
            <span className="text-muted-foreground">Total Pipeline:</span>{" "}
            <span className="font-semibold">
              ${totalValue.toLocaleString()}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground">Weighted:</span>{" "}
            <span className="font-semibold">
              ${weightedValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </span>
          </div>
        </div>
      </div>

      {/* Kanban Board */}
      <KanbanBoard
        stages={stages}
        opportunitiesByStage={opportunitiesByStage}
      />
    </div>
  );
}
