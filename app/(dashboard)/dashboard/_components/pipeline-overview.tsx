"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface PipelineStage {
  name: string;
  count: number;
  color: string;
}

interface PipelineOverviewProps {
  data: PipelineStage[];
}

export function PipelineOverview({ data }: PipelineOverviewProps) {
  const totalLeads = data.reduce((acc, stage) => acc + stage.count, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Lead Pipeline</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 || totalLeads === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>No leads in pipeline yet</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Pipeline Bar */}
            <div className="flex h-4 rounded-full overflow-hidden bg-muted">
              {data.map((stage, index) => {
                const percentage = totalLeads > 0 ? (stage.count / totalLeads) * 100 : 0;
                if (percentage === 0) return null;
                return (
                  <div
                    key={stage.name}
                    className="transition-all duration-500"
                    style={{
                      width: `${percentage}%`,
                      backgroundColor: stage.color,
                    }}
                    title={`${stage.name}: ${stage.count} (${percentage.toFixed(0)}%)`}
                  />
                );
              })}
            </div>

            {/* Stage Details */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mt-6">
              {data.map((stage) => (
                <div
                  key={stage.name}
                  className="text-center p-3 rounded-lg bg-muted/50"
                >
                  <div
                    className="w-3 h-3 rounded-full mx-auto mb-2"
                    style={{ backgroundColor: stage.color }}
                  />
                  <p className="text-2xl font-bold">{stage.count}</p>
                  <p className="text-xs text-muted-foreground truncate">{stage.name}</p>
                </div>
              ))}
            </div>

            {/* Conversion Rate */}
            <div className="flex items-center justify-between pt-4 border-t">
              <span className="text-sm text-muted-foreground">Total Leads</span>
              <Badge variant="secondary">{totalLeads}</Badge>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
