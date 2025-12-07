"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface LeadsBySourceProps {
  data: {
    source: string | null;
    _count: number | boolean | Record<string, number> | undefined;
  }[];
}

const sourceLabels: Record<string, string> = {
  REFERRAL: "Referral",
  WEBSITE: "Website",
  COLD_CALL: "Cold Call",
  LINKEDIN: "LinkedIn",
  TRADE_SHOW: "Trade Show",
  ADVERTISEMENT: "Advertisement",
  EMAIL_CAMPAIGN: "Email Campaign",
  OTHER: "Other",
};

const sourceColors: Record<string, string> = {
  REFERRAL: "#22C55E",
  WEBSITE: "#3B82F6",
  COLD_CALL: "#F97316",
  LINKEDIN: "#0077B5",
  TRADE_SHOW: "#8B5CF6",
  ADVERTISEMENT: "#EC4899",
  EMAIL_CAMPAIGN: "#14B8A6",
  OTHER: "#6B7280",
};

function getCount(count: number | boolean | Record<string, number> | undefined): number {
  return typeof count === 'number' ? count : 0;
}

export function LeadsBySource({ data }: LeadsBySourceProps) {
  const total = data.reduce((sum, item) => sum + getCount(item._count), 0);
  const sortedData = [...data].sort((a, b) => getCount(b._count) - getCount(a._count));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Leads by Source</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No lead data available
          </div>
        ) : (
          <div className="space-y-4">
            {sortedData.map((item) => {
              const source = item.source || "OTHER";
              const count = getCount(item._count);
              const percentage = total > 0 ? (count / total) * 100 : 0;

              return (
                <div key={source} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: sourceColors[source] || "#6B7280" }}
                      />
                      <span>{sourceLabels[source] || source}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{count}</span>
                      <span className="text-muted-foreground text-xs">
                        ({percentage.toFixed(0)}%)
                      </span>
                    </div>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${percentage}%`,
                        backgroundColor: sourceColors[source] || "#6B7280",
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
