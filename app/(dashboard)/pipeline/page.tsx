import { getAuthContext } from "@/lib/auth";
import prisma from "@/lib/db";
import { KanbanBoard } from "./_components/kanban-board";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LayoutGrid, BarChart3, DollarSign, Target, TrendingUp, Clock } from "lucide-react";

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
  const openOpportunities = opportunities.filter((opp) => opp.closedWon === null);
  const wonOpportunities = opportunities.filter((opp) => opp.closedWon === true);
  const lostOpportunities = opportunities.filter((opp) => opp.closedWon === false);

  const totalValue = openOpportunities.reduce((sum, opp) => sum + Number(opp.value), 0);
  const weightedValue = openOpportunities.reduce((sum, opp) => sum + Number(opp.value) * (opp.probability / 100), 0);
  const wonValue = wonOpportunities.reduce((sum, opp) => sum + Number(opp.value), 0);
  const lostValue = lostOpportunities.reduce((sum, opp) => sum + Number(opp.value), 0);

  // Win rate calculation
  const winRate = (wonOpportunities.length + lostOpportunities.length) > 0
    ? (wonOpportunities.length / (wonOpportunities.length + lostOpportunities.length)) * 100
    : 0;

  // Average deal size
  const avgDealSize = wonOpportunities.length > 0
    ? wonValue / wonOpportunities.length
    : openOpportunities.length > 0
      ? totalValue / openOpportunities.length
      : 0;

  // Stage analytics
  const stageAnalytics = stages.map((stage) => {
    const stageOpps = opportunitiesByStage[stage.id] || [];
    const stageValue = stageOpps.reduce((sum, opp) => sum + Number(opp.value), 0);
    return {
      name: stage.name,
      count: stageOpps.length,
      value: stageValue,
      color: stage.color || "#3b82f6",
      probability: stage.probability || 0,
    };
  });

  const formatCurrency = (value: number) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
    return `$${value.toFixed(0)}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Pipeline</h2>
          <p className="text-muted-foreground">
            Manage your sales pipeline and track opportunities
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

      {/* Tabs: Board & Analytics */}
      <Tabs defaultValue="board" className="space-y-4">
        <TabsList>
          <TabsTrigger value="board" className="gap-2">
            <LayoutGrid className="h-4 w-4" />
            Board View
          </TabsTrigger>
          <TabsTrigger value="analytics" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="board">
          <KanbanBoard
            stages={stages}
            opportunitiesByStage={opportunitiesByStage}
          />
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-500/10">
                    <Target className="h-5 w-5 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{openOpportunities.length}</p>
                    <p className="text-xs text-muted-foreground">Open Deals</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-green-500/10">
                    <DollarSign className="h-5 w-5 text-green-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{formatCurrency(totalValue)}</p>
                    <p className="text-xs text-muted-foreground">Pipeline Value</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-purple-500/10">
                    <TrendingUp className="h-5 w-5 text-purple-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{winRate.toFixed(0)}%</p>
                    <p className="text-xs text-muted-foreground">Win Rate</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-emerald-500/10">
                    <DollarSign className="h-5 w-5 text-emerald-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{formatCurrency(wonValue)}</p>
                    <p className="text-xs text-muted-foreground">Won This Year</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-orange-500/10">
                    <Clock className="h-5 w-5 text-orange-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{formatCurrency(avgDealSize)}</p>
                    <p className="text-xs text-muted-foreground">Avg Deal Size</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Pipeline Funnel */}
          <Card>
            <CardHeader>
              <CardTitle>Pipeline by Stage</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {stageAnalytics.map((stage, index) => {
                  const maxValue = Math.max(...stageAnalytics.map(s => s.value), 1);
                  const widthPercent = Math.max((stage.value / maxValue) * 100, 5);
                  
                  return (
                    <div key={stage.name} className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: stage.color }}
                          />
                          <span className="font-medium">{stage.name}</span>
                          <span className="text-muted-foreground">({stage.count} deals)</span>
                        </div>
                        <span className="font-semibold">{formatCurrency(stage.value)}</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-3">
                        <div
                          className="h-3 rounded-full transition-all"
                          style={{ 
                            width: `${widthPercent}%`,
                            backgroundColor: stage.color,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Win/Loss Summary */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-green-500">Won Deals</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-6">
                  <p className="text-4xl font-bold text-green-500">{wonOpportunities.length}</p>
                  <p className="text-sm text-muted-foreground mt-1">deals worth {formatCurrency(wonValue)}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-red-500">Lost Deals</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-6">
                  <p className="text-4xl font-bold text-red-500">{lostOpportunities.length}</p>
                  <p className="text-sm text-muted-foreground mt-1">deals worth {formatCurrency(lostValue)}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Forecast */}
          <Card>
            <CardHeader>
              <CardTitle>Pipeline Forecast</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">Best Case</p>
                  <p className="text-2xl font-bold">{formatCurrency(totalValue)}</p>
                  <p className="text-xs text-muted-foreground">100% close rate</p>
                </div>
                <div className="p-4 bg-primary/10 rounded-lg">
                  <p className="text-sm text-muted-foreground">Expected</p>
                  <p className="text-2xl font-bold text-primary">{formatCurrency(weightedValue)}</p>
                  <p className="text-xs text-muted-foreground">Weighted by probability</p>
                </div>
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">Worst Case</p>
                  <p className="text-2xl font-bold">{formatCurrency(weightedValue * 0.5)}</p>
                  <p className="text-xs text-muted-foreground">50% of weighted</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
