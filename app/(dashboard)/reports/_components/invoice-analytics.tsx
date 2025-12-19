"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
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

// Currency symbols mapping
const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: "$",
  EUR: "€",
  GBP: "£",
  EGP: "E£",
  AED: "د.إ",
  SAR: "﷼",
  JPY: "¥",
  CNY: "¥",
  INR: "₹",
  CAD: "C$",
  AUD: "A$",
};

function formatCurrency(amount: number, currency: string): string {
  const symbol = CURRENCY_SYMBOLS[currency] || currency + " ";
  return `${symbol}${amount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

interface InvoiceOverviewProps {
  totalInvoiced: number;
  totalPaid: number;
  totalOverdue: number;
  totalPending: number;
  currency?: string;
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
  totalPending,
  currency = "USD",
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
        <CardTitle>Invoice Overview ({currency})</CardTitle>
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
                formatter={(value: number) => [formatCurrency(value, currency), 'Amount']}
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

interface CurrencyBreakdownProps {
  byCurrency: Record<string, {
    totalInvoiced: number;
    totalPaid: number;
    totalOverdue: number;
    totalPending: number;
    invoiceCount: number;
    collectionRate: number;
  }>;
}

export function CurrencyBreakdown({ byCurrency }: CurrencyBreakdownProps) {
  const currencies = Object.entries(byCurrency).sort((a, b) => b[1].invoiceCount - a[1].invoiceCount);

  if (currencies.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Revenue by Currency</CardTitle>
          <CardDescription>Breakdown of invoices across currencies</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[200px] flex items-center justify-center text-muted-foreground">
            No invoice data available
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Revenue by Currency</CardTitle>
        <CardDescription>Breakdown of invoices across {currencies.length} currenc{currencies.length === 1 ? 'y' : 'ies'}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {currencies.map(([currency, data]) => (
            <div key={currency} className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-lg">{currency}</span>
                  <span className="text-sm text-muted-foreground">
                    ({data.invoiceCount} invoice{data.invoiceCount !== 1 ? 's' : ''})
                  </span>
                </div>
                <span className="text-sm font-medium text-green-600">
                  {data.collectionRate.toFixed(0)}% collected
                </span>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Invoiced</span>
                    <span className="font-medium">{formatCurrency(data.totalInvoiced, currency)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Collected</span>
                    <span className="font-medium text-green-600">{formatCurrency(data.totalPaid, currency)}</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Pending</span>
                    <span className="font-medium text-yellow-600">{formatCurrency(data.totalPending, currency)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Overdue</span>
                    <span className="font-medium text-red-600">{formatCurrency(data.totalOverdue, currency)}</span>
                  </div>
                </div>
              </div>

              <Progress 
                value={data.collectionRate} 
                className="h-2"
              />
            </div>
          ))}
        </div>
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
  currency?: string;
}

export function InvoicesByStatus({ data, currency = "USD" }: InvoicesByStatusProps) {
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
              <XAxis 
                type="number" 
                tickFormatter={(v) => {
                  const symbol = CURRENCY_SYMBOLS[currency] || "";
                  return `${symbol}${(v/1000).toFixed(0)}k`;
                }} 
              />
              <YAxis dataKey="name" type="category" width={100} />
              <Tooltip 
                formatter={(value: number) => [formatCurrency(value, currency), 'Total Value']}
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
    currency?: string;
  }[];
  currency?: string;
}

export function MonthlyRevenue({ data, currency = "USD" }: MonthlyRevenueProps) {
  return (
    <Card className="col-span-2">
      <CardHeader>
        <CardTitle>Monthly Revenue ({currency})</CardTitle>
        <CardDescription>Invoiced vs Collected over time</CardDescription>
      </CardHeader>
      <CardContent>
        {data.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="month" />
              <YAxis 
                tickFormatter={(v) => {
                  const symbol = CURRENCY_SYMBOLS[currency] || "";
                  return `${symbol}${(v/1000).toFixed(0)}k`;
                }} 
              />
              <Tooltip 
                formatter={(value: number) => [formatCurrency(value, currency), '']}
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
