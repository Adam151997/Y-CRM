"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface FunnelStage {
  name: string;
  value: number;
  count: number;
  color: string;
}

interface PipelineFunnelProps {
  stages: FunnelStage[];
}

export function PipelineFunnel({ stages }: PipelineFunnelProps) {
  const maxValue = Math.max(...stages.map((s) => s.value), 1);
  const maxCount = Math.max(...stages.map((s) => s.count), 1);

  const formatCurrency = (value: number) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
    return `$${value.toFixed(0)}`;
  };

  // Calculate conversion rates between stages
  const stagesWithConversion = stages.map((stage, index) => {
    if (index === 0) return { ...stage, conversionRate: null };
    const prevCount = stages[index - 1].count;
    const conversionRate = prevCount > 0 ? (stage.count / prevCount) * 100 : 0;
    return { ...stage, conversionRate };
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pipeline Funnel</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {stagesWithConversion.map((stage, index) => {
            const widthPercent = Math.max((stage.count / maxCount) * 100, 20);

            return (
              <div key={stage.name} className="space-y-1">
                {/* Conversion rate indicator */}
                {stage.conversionRate !== null && (
                  <div className="flex items-center justify-center text-xs text-muted-foreground">
                    <span className="px-2 py-0.5 bg-muted rounded-full">
                      ↓ {stage.conversionRate.toFixed(0)}%
                    </span>
                  </div>
                )}
                
                {/* Stage bar */}
                <div className="relative">
                  <div
                    className="h-12 rounded-lg flex items-center justify-between px-4 transition-all mx-auto"
                    style={{
                      width: `${widthPercent}%`,
                      backgroundColor: stage.color,
                      minWidth: "120px",
                    }}
                  >
                    <span className="text-white font-medium text-sm truncate">
                      {stage.name}
                    </span>
                    <div className="text-white text-right">
                      <div className="text-sm font-bold">{stage.count}</div>
                      <div className="text-xs opacity-80">{formatCurrency(stage.value)}</div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        
        {/* Summary */}
        <div className="mt-6 pt-4 border-t grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold">{stages.reduce((sum, s) => sum + s.count, 0)}</p>
            <p className="text-xs text-muted-foreground">Total Deals</p>
          </div>
          <div>
            <p className="text-2xl font-bold">{formatCurrency(stages.reduce((sum, s) => sum + s.value, 0))}</p>
            <p className="text-xs text-muted-foreground">Total Value</p>
          </div>
          <div>
            <p className="text-2xl font-bold">
              {stages.length > 1 && stages[0].count > 0
                ? ((stages[stages.length - 1].count / stages[0].count) * 100).toFixed(0)
                : 0}%
            </p>
            <p className="text-xs text-muted-foreground">Overall Conversion</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
