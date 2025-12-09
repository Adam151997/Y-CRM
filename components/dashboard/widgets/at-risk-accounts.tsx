"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

interface AtRiskAccount {
  id: string;
  accountId: string;
  accountName: string;
  score: number;
  riskLevel: string;
  riskReasons?: string[];
}

interface AtRiskAccountsData {
  accounts: AtRiskAccount[];
}

export function AtRiskAccountsWidget() {
  const [data, setData] = useState<AtRiskAccountsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch("/api/cs/health?riskLevel=HIGH,CRITICAL&limit=5");
        if (response.ok) {
          const result = await response.json();
          const accounts = (result.healthScores || []).map((h: {
            id: string;
            accountId: string;
            account: { name: string };
            score: number;
            riskLevel: string;
            riskReasons?: string[];
          }) => ({
            id: h.id,
            accountId: h.accountId,
            accountName: h.account?.name || "Unknown",
            score: h.score,
            riskLevel: h.riskLevel,
            riskReasons: h.riskReasons,
          }));
          setData({ accounts });
        }
      } catch (error) {
        console.error("Error fetching at-risk accounts:", error);
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

  if (!data || data.accounts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
        <CheckCircle className="h-8 w-8 mb-2 text-green-500" />
        <p>All accounts are healthy!</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {data.accounts.map((account) => (
        <Link
          key={account.id}
          href={`/cs/accounts/${account.accountId}`}
          className="flex items-center justify-between p-2 rounded-lg border hover:bg-accent transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className={`p-1.5 rounded ${
              account.riskLevel === "CRITICAL" 
                ? "bg-red-500/10 text-red-500" 
                : "bg-orange-500/10 text-orange-500"
            }`}>
              <AlertTriangle className="h-4 w-4" />
            </div>
            <div>
              <p className="font-medium text-sm">{account.accountName}</p>
              <p className="text-xs text-muted-foreground">Score: {account.score}/100</p>
            </div>
          </div>
          <Badge variant={account.riskLevel === "CRITICAL" ? "destructive" : "secondary"}>
            {account.riskLevel}
          </Badge>
        </Link>
      ))}
      <Link
        href="/cs/health"
        className="flex items-center justify-center gap-1 text-sm text-primary hover:underline pt-2"
      >
        View all health scores
      </Link>
    </div>
  );
}
