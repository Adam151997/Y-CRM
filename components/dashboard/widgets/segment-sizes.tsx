"use client";

import { useEffect, useState } from "react";
import { UsersRound } from "lucide-react";
import Link from "next/link";

interface Segment {
  id: string;
  name: string;
  memberCount: number;
  isActive: boolean;
}

interface SegmentSizesData {
  segments: Segment[];
}

const colors = [
  "bg-blue-500",
  "bg-green-500",
  "bg-purple-500",
  "bg-orange-500",
  "bg-pink-500",
];

export function SegmentSizesWidget() {
  const [data, setData] = useState<SegmentSizesData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch("/api/marketing/segments?isActive=true&limit=5");
        if (response.ok) {
          const result = await response.json();
          setData({ segments: result.segments || [] });
        }
      } catch (error) {
        console.error("Error fetching segments:", error);
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

  if (!data || data.segments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
        <UsersRound className="h-8 w-8 mb-2 opacity-50" />
        <p>No segments created</p>
        <Link href="/marketing/segments/new" className="text-primary text-sm mt-2 hover:underline">
          Create segment
        </Link>
      </div>
    );
  }

  const totalMembers = data.segments.reduce((sum, s) => sum + s.memberCount, 0);

  return (
    <div className="space-y-3">
      {data.segments.map((segment, index) => {
        const percentage = totalMembers > 0 ? Math.round((segment.memberCount / totalMembers) * 100) : 0;
        return (
          <Link
            key={segment.id}
            href={`/marketing/segments/${segment.id}`}
            className="block hover:bg-accent rounded-lg p-2 transition-colors"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium">{segment.name}</span>
              <span className="text-sm text-muted-foreground">{segment.memberCount.toLocaleString()}</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div 
                className={`h-full ${colors[index % colors.length]} transition-all`}
                style={{ width: `${Math.max(percentage, 2)}%` }}
              />
            </div>
          </Link>
        );
      })}
      <div className="text-center text-xs text-muted-foreground pt-2">
        Total: {totalMembers.toLocaleString()} contacts across {data.segments.length} segments
      </div>
    </div>
  );
}
