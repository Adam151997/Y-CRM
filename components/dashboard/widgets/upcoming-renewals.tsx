"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { format, differenceInDays } from "date-fns";
import { Calendar, DollarSign } from "lucide-react";
import { cn } from "@/lib/utils";

interface Renewal {
  id: string;
  contractName: string;
  accountName: string;
  contractValue: number;
  endDate: string;
  status: string;
}

const statusColors: Record<string, string> = {
  UPCOMING: "bg-blue-100 text-blue-700",
  IN_PROGRESS: "bg-yellow-100 text-yellow-700",
  AT_RISK: "bg-red-100 text-red-700",
};

export function UpcomingRenewalsWidget() {
  const [renewals, setRenewals] = useState<Renewal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch("/api/dashboard/widgets/upcoming-renewals");
        if (response.ok) {
          const result = await response.json();
          setRenewals(result.renewals || []);
        }
      } catch (error) {
        console.error("Error fetching renewals:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (renewals.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        No upcoming renewals
      </div>
    );
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="space-y-3">
      {renewals.map((renewal) => {
        const daysUntil = differenceInDays(new Date(renewal.endDate), new Date());
        const isUrgent = daysUntil <= 30;

        return (
          <Link
            key={renewal.id}
            href={`/cs/renewals/${renewal.id}`}
            className="block p-2 rounded-lg hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{renewal.contractName}</p>
                <p className="text-xs text-muted-foreground truncate">{renewal.accountName}</p>
              </div>
              <Badge className={cn("text-xs ml-2", statusColors[renewal.status] || "bg-gray-100")}>
                {renewal.status.replace("_", " ")}
              </Badge>
            </div>
            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <DollarSign className="h-3 w-3" />
                {formatCurrency(renewal.contractValue)}
              </span>
              <span className={cn("flex items-center gap-1", isUrgent && "text-red-600 font-medium")}>
                <Calendar className="h-3 w-3" />
                {daysUntil <= 0 ? "Overdue" : `${daysUntil} days`}
              </span>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
