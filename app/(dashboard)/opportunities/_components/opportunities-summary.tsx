"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Target, TrendingUp, DollarSign } from "lucide-react";

interface OpportunitiesSummaryProps {
  totalValue: number;
  weightedValue: number;
  count: number;
}

export function OpportunitiesSummary({
  totalValue,
  weightedValue,
  count,
}: OpportunitiesSummaryProps) {
  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `$${(value / 1000).toFixed(0)}K`;
    }
    return `$${value.toFixed(0)}`;
  };

  const stats = [
    {
      title: "Open Opportunities",
      value: count,
      icon: Target,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    {
      title: "Total Pipeline",
      value: formatCurrency(totalValue),
      icon: DollarSign,
      color: "text-green-500",
      bgColor: "bg-green-500/10",
    },
    {
      title: "Weighted Pipeline",
      value: formatCurrency(weightedValue),
      icon: TrendingUp,
      color: "text-purple-500",
      bgColor: "bg-purple-500/10",
      subtitle: "Based on probability",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {stats.map((stat) => (
        <Card key={stat.title}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </div>
            </div>
            <div className="mt-4">
              <p className="text-2xl font-bold">{stat.value}</p>
              <p className="text-sm text-muted-foreground">{stat.title}</p>
              {stat.subtitle && (
                <p className="text-xs text-muted-foreground mt-1">{stat.subtitle}</p>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
