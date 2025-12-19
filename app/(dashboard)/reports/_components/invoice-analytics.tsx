"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

interface InvoiceOverviewProps {
  totalInvoiced: number;
  totalPaid: number;
  totalOverdue: number;
  totalPending: number;
}

const COLORS = {
  paid: "#22c55e",
  pending: "#f59e0b", 
  overdue: "#ef4444",
  draft: "#6b7280",
};

export function InvoiceOverview({ 
  totalInvoiced, 
  totalPaid, 
  totalOverdue, 
  totalPending 
}: InvoiceOverviewProps) {
  const data = [
    { name: "Paid", value: totalPaid, color: COLORS.paid },
    { name: "Pending", value: totalPending, color: COLORS.pending },
    { name: "Overdue", value: totalOverdue, color: COLORS.overdue },
  ].filter(d => d.value > 0);

  const collectionRate = totalInvoiced > 0 
    ? ((totalPaid / totalInvoiced) * 100).toFixed(1) 
    : "0";

  return (
    <Card>
      <CardHeader>
        <CardTitle>Invoice Overview</CardTitle>
        <CardDescription>
          Payment status breakdown • {collectionRate}% collection rate
        </CardDescription>
      </CardHeader>
      <CardContent>
        {data.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={2}
                dataKey="value"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value: number) => [`$${value.toLocaleString()}`, 'Amount']}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            No invoice data available
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface InvoicesByStatusProps {
  data: {
    status: string;
    _count: number;
    _sum: { total: number | null; amountPaid?: number | null };
  }[];
}

export function InvoicesByStatus({ data }: InvoicesByStatusProps) {
  const chartData = data.map(item => ({
    name: item.status.replace("_", " "),
    count: item._count,
    value: Number(item._sum.total || 0),
  }));

  const statusColors: Record<string, string> = {
    DRAFT: "#6b7280",
    SENT: "#3b82f6",
    PAID: "#22c55e",
    "PARTIALLY PAID": "#f59e0b",
    OVERDUE: "#ef4444",
    CANCELLED: "#94a3b8",
    REFUNDED: "#8b5cf6",
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Invoices by Status</CardTitle>
        <CardDescription>Count and value by invoice status</CardDescription>
      </CardHeader>
      <CardContent>
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
              <XAxis type="number" tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} />
              <YAxis dataKey="name" type="category" width={100} />
              <Tooltip 
                formatter={(value: number) => [`$${value.toLocaleString()}`, 'Total Value']}
              />
              <Bar 
                dataKey="value" 
                radius={[0, 4, 4, 0]}
                fill="#6366f1"
              >
                {chartData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={statusColors[entry.name.toUpperCase()] || "#6366f1"} 
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            No invoice data available
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface MonthlyRevenueProps {
  data: {
    month: string;
    invoiced: number;
    collected: number;
  }[];
}

export function MonthlyRevenue({ data }: MonthlyRevenueProps) {
  return (
    <Card className="col-span-2">
      <CardHeader>
        <CardTitle>Monthly Revenue</CardTitle>
        <CardDescription>Invoiced vs Collected over time</CardDescription>
      </CardHeader>
      <CardContent>
        {data.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="month" />
              <YAxis tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} />
              <Tooltip 
                formatter={(value: number) => [`$${value.toLocaleString()}`, '']}
              />
              <Legend />
              <Bar dataKey="invoiced" name="Invoiced" fill="#6366f1" radius={[4, 4, 0, 0]} />
              <Bar dataKey="collected" name="Collected" fill="#22c55e" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            No invoice data available
          </div>
        )}
      </CardContent>
    </Card>
  );
}
