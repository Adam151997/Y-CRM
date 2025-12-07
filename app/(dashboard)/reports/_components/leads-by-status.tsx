"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface LeadsByStatusProps {
  data: {
    status: string;
    _count: number;
  }[];
}

const statusLabels: Record<string, string> = {
  NEW: "New",
  CONTACTED: "Contacted",
  QUALIFIED: "Qualified",
  CONVERTED: "Converted",
  LOST: "Lost",
};

const statusColors: Record<string, string> = {
  NEW: "#3B82F6",
  CONTACTED: "#F97316",
  QUALIFIED: "#8B5CF6",
  CONVERTED: "#22C55E",
  LOST: "#EF4444",
};

export function LeadsByStatus({ data }: LeadsByStatusProps) {
  const total = data.reduce((sum, item) => sum + item._count, 0);
  
  // Sort by the natural status order
  const statusOrder = ["NEW", "CONTACTED", "QUALIFIED", "CONVERTED", "LOST"];
  const sortedData = [...data].sort(
    (a, b) => statusOrder.indexOf(a.status) - statusOrder.indexOf(b.status)
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Leads by Status</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No lead data available
          </div>
        ) : (
          <div className="space-y-4">
            {/* Visual bar */}
            <div className="flex h-8 rounded-lg overflow-hidden">
              {sortedData.map((item) => {
                const percentage = total > 0 ? (item._count / total) * 100 : 0;
                if (percentage === 0) return null;

                return (
                  <div
                    key={item.status}
                    className="transition-all"
                    style={{
                      width: `${percentage}%`,
                      backgroundColor: statusColors[item.status] || "#6B7280",
                    }}
                    title={`${statusLabels[item.status]}: ${item._count} (${percentage.toFixed(0)}%)`}
                  />
                );
              })}
            </div>

            {/* Legend */}
            <div className="grid grid-cols-2 gap-3">
              {sortedData.map((item) => {
                const percentage = total > 0 ? (item._count / total) * 100 : 0;

                return (
                  <div key={item.status} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: statusColors[item.status] || "#6B7280" }}
                      />
                      <span className="text-sm">{statusLabels[item.status]}</span>
                    </div>
                    <span className="text-sm font-medium">
                      {item._count}{" "}
                      <span className="text-muted-foreground text-xs">
                        ({percentage.toFixed(0)}%)
                      </span>
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
