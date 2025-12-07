"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Users, Building2, Target, CheckSquare, TrendingUp, TrendingDown } from "lucide-react";

interface DashboardStatsProps {
  stats: {
    totalLeads: number;
    newLeadsThisMonth: number;
    totalContacts: number;
    totalAccounts: number;
    openOpportunities: number;
    opportunityValue: number;
    pendingTasks: number;
    completedTasksThisWeek: number;
  };
}

export function DashboardStats({ stats }: DashboardStatsProps) {
  const statItems = [
    {
      title: "Total Leads",
      value: stats.totalLeads,
      subtitle: `+${stats.newLeadsThisMonth} this month`,
      icon: Users,
      trend: stats.newLeadsThisMonth > 0 ? "up" : "neutral",
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    {
      title: "Contacts",
      value: stats.totalContacts,
      subtitle: "Active contacts",
      icon: Users,
      trend: "neutral",
      color: "text-green-500",
      bgColor: "bg-green-500/10",
    },
    {
      title: "Accounts",
      value: stats.totalAccounts,
      subtitle: "Companies tracked",
      icon: Building2,
      trend: "neutral",
      color: "text-purple-500",
      bgColor: "bg-purple-500/10",
    },
    {
      title: "Open Opportunities",
      value: stats.openOpportunities,
      subtitle: formatCurrency(stats.opportunityValue),
      icon: Target,
      trend: stats.opportunityValue > 0 ? "up" : "neutral",
      color: "text-orange-500",
      bgColor: "bg-orange-500/10",
    },
    {
      title: "Pending Tasks",
      value: stats.pendingTasks,
      subtitle: `${stats.completedTasksThisWeek} completed this week`,
      icon: CheckSquare,
      trend: stats.completedTasksThisWeek > 0 ? "up" : "neutral",
      color: "text-rose-500",
      bgColor: "bg-rose-500/10",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      {statItems.map((stat) => (
        <Card key={stat.title}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </div>
              {stat.trend === "up" && (
                <TrendingUp className="h-4 w-4 text-green-500" />
              )}
              {stat.trend === "down" && (
                <TrendingDown className="h-4 w-4 text-red-500" />
              )}
            </div>
            <div className="mt-4">
              <p className="text-2xl font-bold">{stat.value.toLocaleString()}</p>
              <p className="text-sm text-muted-foreground">{stat.title}</p>
              <p className="text-xs text-muted-foreground mt-1">{stat.subtitle}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function formatCurrency(value: number): string {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M pipeline`;
  }
  if (value >= 1000) {
    return `$${(value / 1000).toFixed(0)}K pipeline`;
  }
  return `$${value} pipeline`;
}
