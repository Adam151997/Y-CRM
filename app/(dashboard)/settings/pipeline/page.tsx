import { getAuthContext } from "@/lib/auth";
import prisma from "@/lib/db";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PipelineStagesList } from "./_components/pipeline-stages-list";
import { AddStageButton } from "./_components/add-stage-button";

const modules = ["LEAD", "OPPORTUNITY"] as const;

const moduleLabels: Record<string, string> = {
  LEAD: "Lead Pipeline",
  OPPORTUNITY: "Opportunity Pipeline",
};

export default async function PipelineSettingsPage() {
  const { orgId } = await getAuthContext();

  const stages = await prisma.pipelineStage.findMany({
    where: { orgId },
    orderBy: [{ module: "asc" }, { order: "asc" }],
    include: {
      _count: {
        select: {
          leads: true,
          opportunities: true,
        },
      },
    },
  });

  // Group by module
  const stagesByModule = modules.reduce((acc, module) => {
    acc[module] = stages.filter((s) => s.module === module);
    return acc;
  }, {} as Record<string, typeof stages>);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Pipeline Stages</CardTitle>
            <CardDescription>
              Configure the stages for your sales pipelines
            </CardDescription>
          </div>
          <AddStageButton />
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="OPPORTUNITY">
            <TabsList>
              {modules.map((module) => (
                <TabsTrigger key={module} value={module}>
                  {moduleLabels[module]}
                </TabsTrigger>
              ))}
            </TabsList>

            {modules.map((module) => (
              <TabsContent key={module} value={module} className="mt-4">
                <PipelineStagesList
                  stages={stagesByModule[module]}
                  module={module}
                />
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
