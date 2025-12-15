"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Clock, Target, DollarSign } from "lucide-react";

interface SalesVelocityProps {
  avgDealSize: number;
  avgSalesCycle: number; // in days
  winRate: number; // percentage
  dealsPerMonth: number;
}

export function SalesVelocity({
  avgDealSize,
  avgSalesCycle,
  winRate,
  dealsPerMonth,
}: SalesVelocityProps) {
  // Sales Velocity Formula: (# of Opportunities × Win Rate × Average Deal Size) / Sales Cycle
  // This gives monthly revenue velocity
  const velocity = avgSalesCycle > 0 
    ? (dealsPerMonth * (winRate / 100) * avgDealSize) 
    : 0;

  const formatCurrency = (value: number) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(1)}K`;
    return `$${value.toFixed(0)}`;
  };

  const metrics = [
    {
      icon: Target,
      label: "Deals/Month",
      value: dealsPerMonth.toFixed(1),
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    {
      icon: TrendingUp,
      label: "Win Rate",
      value: `${winRate.toFixed(0)}%`,
      color: "text-green-500",
      bgColor: "bg-green-500/10",
    },
    {
      icon: DollarSign,
      label: "Avg Deal Size",
      value: formatCurrency(avgDealSize),
      color: "text-purple-500",
      bgColor: "bg-purple-500/10",
    },
    {
      icon: Clock,
      label: "Sales Cycle",
      value: `${avgSalesCycle.toFixed(0)} days`,
      color: "text-orange-500",
      bgColor: "bg-orange-500/10",
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sales Velocity</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Main Velocity Metric */}
        <div className="text-center py-6 bg-gradient-to-br from-primary/10 to-primary/5 rounded-xl">
          <p className="text-sm text-muted-foreground mb-1">Monthly Revenue Velocity</p>
          <p className="text-4xl font-bold text-primary">{formatCurrency(velocity)}</p>
          <p className="text-xs text-muted-foreground mt-2">
            Expected monthly revenue based on current metrics
          </p>
        </div>

        {/* Component Metrics */}
        <div className="grid grid-cols-2 gap-4">
          {metrics.map((metric) => (
            <div
              key={metric.label}
              className="flex items-center gap-3 p-3 rounded-lg border"
            >
              <div className={`p-2 rounded-lg ${metric.bgColor}`}>
                <metric.icon className={`h-4 w-4 ${metric.color}`} />
              </div>
              <div>
                <p className="text-lg font-semibold">{metric.value}</p>
                <p className="text-xs text-muted-foreground">{metric.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Formula explanation */}
        <div className="text-xs text-muted-foreground text-center pt-4 border-t">
          Velocity = Deals × Win Rate × Avg Deal Size
        </div>
      </CardContent>
    </Card>
  );
}
