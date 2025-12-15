"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface LeadConversionFunnelProps {
  data: {
    status: string;
    count: number;
  }[];
}

const statusConfig: Record<string, { color: string; label: string; order: number }> = {
  NEW: { color: "#3b82f6", label: "New", order: 1 },
  CONTACTED: { color: "#f59e0b", label: "Contacted", order: 2 },
  QUALIFIED: { color: "#8b5cf6", label: "Qualified", order: 3 },
  CONVERTED: { color: "#22c55e", label: "Converted", order: 4 },
  LOST: { color: "#ef4444", label: "Lost", order: 5 },
};

export function LeadConversionFunnel({ data }: LeadConversionFunnelProps) {
  // Sort data by funnel order (excluding LOST)
  const funnelData = data
    .filter((d) => d.status !== "LOST")
    .sort((a, b) => {
      const orderA = statusConfig[a.status]?.order || 99;
      const orderB = statusConfig[b.status]?.order || 99;
      return orderA - orderB;
    });

  const lostData = data.find((d) => d.status === "LOST");
  const totalLeads = data.reduce((sum, d) => sum + d.count, 0);
  const maxCount = Math.max(...funnelData.map((d) => d.count), 1);

  // Calculate conversion rates
  const funnelWithConversion = funnelData.map((stage, index) => {
    if (index === 0) return { ...stage, conversionRate: null };
    const prevCount = funnelData[index - 1].count;
    const conversionRate = prevCount > 0 ? (stage.count / prevCount) * 100 : 0;
    return { ...stage, conversionRate };
  });

  // Overall conversion rate (NEW -> CONVERTED)
  const newCount = data.find((d) => d.status === "NEW")?.count || 0;
  const convertedCount = data.find((d) => d.status === "CONVERTED")?.count || 0;
  const overallConversionRate = newCount > 0 ? (convertedCount / newCount) * 100 : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Lead Conversion Funnel</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {funnelWithConversion.map((stage) => {
            const config = statusConfig[stage.status] || { color: "#6b7280", label: stage.status };
            const widthPercent = Math.max((stage.count / maxCount) * 100, 25);

            return (
              <div key={stage.status} className="space-y-1">
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
                    className="h-10 rounded-lg flex items-center justify-between px-4 transition-all mx-auto"
                    style={{
                      width: `${widthPercent}%`,
                      backgroundColor: config.color,
                      minWidth: "100px",
                    }}
                  >
                    <span className="text-white font-medium text-sm">{config.label}</span>
                    <span className="text-white font-bold text-sm">{stage.count}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Summary stats */}
        <div className="mt-6 pt-4 border-t grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold">{totalLeads}</p>
            <p className="text-xs text-muted-foreground">Total Leads</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-green-500">{overallConversionRate.toFixed(0)}%</p>
            <p className="text-xs text-muted-foreground">Conversion Rate</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-red-500">{lostData?.count || 0}</p>
            <p className="text-xs text-muted-foreground">Lost Leads</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
