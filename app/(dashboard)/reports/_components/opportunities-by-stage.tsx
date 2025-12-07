"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface Stage {
  id: string;
  name: string;
  color: string | null;
  order: number;
}

interface StageData {
  stageId: string;
  _count: number;
  _sum: {
    value: number | null;
  };
}

interface OpportunitiesByStageProps {
  data: StageData[];
  stages: Stage[];
}

export function OpportunitiesByStage({ data, stages }: OpportunitiesByStageProps) {
  // Map stage data
  const stageMap = new Map(data.map((d) => [d.stageId, d]));
  
  // Calculate total value for percentage
  const totalValue = data.reduce((sum, d) => sum + Number(d._sum.value || 0), 0);
  const totalCount = data.reduce((sum, d) => sum + d._count, 0);

  // Sort stages by order
  const sortedStages = [...stages].sort((a, b) => a.order - b.order);

  const formatCurrency = (value: number) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
    return `$${value.toFixed(0)}`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Opportunities by Stage</CardTitle>
      </CardHeader>
      <CardContent>
        {sortedStages.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            No pipeline stages configured
          </p>
        ) : (
          <div className="space-y-4">
            {sortedStages.map((stage) => {
              const stageData = stageMap.get(stage.id);
              const count = stageData?._count || 0;
              const value = Number(stageData?._sum.value || 0);
              const percentage = totalValue > 0 ? (value / totalValue) * 100 : 0;

              return (
                <div key={stage.id} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: stage.color || "#6B7280" }}
                      />
                      <span className="font-medium">{stage.name}</span>
                      <span className="text-muted-foreground">({count})</span>
                    </div>
                    <span className="font-medium">{formatCurrency(value)}</span>
                  </div>
                  <Progress
                    value={percentage}
                    className="h-2"
                    style={{
                      // @ts-ignore - Custom CSS variable for progress color
                      "--progress-color": stage.color || "#6B7280",
                    }}
                  />
                </div>
              );
            })}

            {/* Total */}
            <div className="pt-4 border-t flex items-center justify-between text-sm font-medium">
              <span>Total ({totalCount} opportunities)</span>
              <span>{formatCurrency(totalValue)}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
