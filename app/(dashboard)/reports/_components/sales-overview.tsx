"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface SalesOverviewProps {
  openValue: number;
  wonValue: number;
  lostValue: number;
}

export function SalesOverview({ openValue, wonValue, lostValue }: SalesOverviewProps) {
  const total = openValue + wonValue + lostValue;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const items = [
    {
      label: "Open Pipeline",
      value: openValue,
      color: "bg-blue-500",
      percentage: total > 0 ? (openValue / total) * 100 : 0,
    },
    {
      label: "Closed Won",
      value: wonValue,
      color: "bg-green-500",
      percentage: total > 0 ? (wonValue / total) * 100 : 0,
    },
    {
      label: "Closed Lost",
      value: lostValue,
      color: "bg-red-500",
      percentage: total > 0 ? (lostValue / total) * 100 : 0,
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sales Overview</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Total */}
        <div className="text-center py-4 bg-muted/50 rounded-lg">
          <p className="text-sm text-muted-foreground">Total Pipeline Value</p>
          <p className="text-3xl font-bold">{formatCurrency(total)}</p>
        </div>

        {/* Breakdown */}
        <div className="space-y-4">
          {items.map((item) => (
            <div key={item.label} className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${item.color}`} />
                  <span>{item.label}</span>
                </div>
                <span className="font-medium">{formatCurrency(item.value)}</span>
              </div>
              <Progress
                value={item.percentage}
                className={`h-2 ${item.color.replace("bg-", "[&>div]:bg-")}`}
              />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
