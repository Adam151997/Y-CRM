"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { DollarSign, Calendar } from "lucide-react";

interface Deal {
  id: string;
  name: string;
  value: number;
  probability: number;
  closeDate: string;
  accountName: string;
}

export function DealsClosingWidget() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch("/api/dashboard/widgets/deals-closing");
        if (response.ok) {
          const result = await response.json();
          setDeals(result.deals || []);
        }
      } catch (error) {
        console.error("Error fetching deals:", error);
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

  if (deals.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        No deals closing soon
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
      {deals.map((deal) => (
        <Link
          key={deal.id}
          href={`/sales/opportunities/${deal.id}`}
          className="block p-2 rounded-lg hover:bg-muted/50 transition-colors"
        >
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{deal.name}</p>
              <p className="text-xs text-muted-foreground truncate">{deal.accountName}</p>
            </div>
            <Badge variant="outline" className="text-xs ml-2">
              {deal.probability}%
            </Badge>
          </div>
          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <DollarSign className="h-3 w-3" />
              {formatCurrency(deal.value)}
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {formatDistanceToNow(new Date(deal.closeDate), { addSuffix: true })}
            </span>
          </div>
        </Link>
      ))}
    </div>
  );
}
