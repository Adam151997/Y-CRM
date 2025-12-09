"use client";

import { useEffect, useState } from "react";
import { Megaphone, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

interface Campaign {
  id: string;
  name: string;
  type: string;
  status: string;
  sent?: number;
  opened?: number;
  clicked?: number;
}

interface CampaignPerformanceData {
  campaigns: Campaign[];
}

const statusColors: Record<string, string> = {
  DRAFT: "bg-slate-500",
  SCHEDULED: "bg-blue-500",
  ACTIVE: "bg-green-500",
  PAUSED: "bg-yellow-500",
  COMPLETED: "bg-purple-500",
};

export function CampaignPerformanceWidget() {
  const [data, setData] = useState<CampaignPerformanceData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch("/api/marketing/campaigns?status=ACTIVE&limit=5");
        if (response.ok) {
          const result = await response.json();
          setData({ campaigns: result.campaigns || [] });
        }
      } catch (error) {
        console.error("Error fetching campaigns:", error);
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

  if (!data || data.campaigns.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
        <Megaphone className="h-8 w-8 mb-2 opacity-50" />
        <p>No active campaigns</p>
        <Link href="/marketing/campaigns/new" className="text-primary text-sm mt-2 hover:underline">
          Create campaign
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {data.campaigns.map((campaign) => (
        <Link
          key={campaign.id}
          href={`/marketing/campaigns/${campaign.id}`}
          className="flex items-center justify-between p-2 rounded-lg border hover:bg-accent transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded bg-orange-500/10">
              <Megaphone className="h-4 w-4 text-orange-500" />
            </div>
            <div>
              <p className="font-medium text-sm">{campaign.name}</p>
              <p className="text-xs text-muted-foreground">{campaign.type}</p>
            </div>
          </div>
          <Badge className={`${statusColors[campaign.status]} text-white text-xs`}>
            {campaign.status}
          </Badge>
        </Link>
      ))}
      <Link
        href="/marketing/campaigns"
        className="flex items-center justify-center gap-1 text-sm text-primary hover:underline pt-2"
      >
        View all campaigns
        <ArrowRight className="h-3 w-3" />
      </Link>
    </div>
  );
}
