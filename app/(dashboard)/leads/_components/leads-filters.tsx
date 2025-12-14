"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, X } from "lucide-react";
import { OwnerFilter, ALL_VALUE as OWNER_ALL } from "@/components/filters/owner-filter";

interface LeadsFiltersProps {
  currentStatus?: string;
  currentSource?: string;
  currentQuery?: string;
  currentOwner?: string;
  currentUserId?: string;
}

const statuses = [
  { value: "NEW", label: "New" },
  { value: "CONTACTED", label: "Contacted" },
  { value: "QUALIFIED", label: "Qualified" },
  { value: "CONVERTED", label: "Converted" },
  { value: "LOST", label: "Lost" },
];

const sources = [
  { value: "REFERRAL", label: "Referral" },
  { value: "WEBSITE", label: "Website" },
  { value: "COLD_CALL", label: "Cold Call" },
  { value: "LINKEDIN", label: "LinkedIn" },
  { value: "TRADE_SHOW", label: "Trade Show" },
  { value: "ADVERTISEMENT", label: "Advertisement" },
  { value: "EMAIL_CAMPAIGN", label: "Email Campaign" },
  { value: "OTHER", label: "Other" },
];

// Use a special value for "All" since Radix Select doesn't allow empty strings
const ALL_VALUE = "_all";

export function LeadsFilters({
  currentStatus,
  currentSource,
  currentQuery,
  currentOwner,
  currentUserId,
}: LeadsFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [query, setQuery] = useState(currentQuery || "");

  const updateFilters = (key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    
    if (value && value !== ALL_VALUE && value !== OWNER_ALL) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    
    // Reset to page 1 when filtering
    params.delete("page");

    startTransition(() => {
      router.push(`/leads?${params.toString()}`);
    });
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    updateFilters("query", query || null);
  };

  const clearFilters = () => {
    setQuery("");
    startTransition(() => {
      router.push("/leads");
    });
  };

  const hasFilters = currentStatus || currentSource || currentQuery || currentOwner;

  return (
    <div className="flex flex-col sm:flex-row gap-4">
      {/* Search */}
      <form onSubmit={handleSearch} className="flex-1 flex gap-2">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search leads..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button type="submit" variant="secondary" disabled={isPending}>
          Search
        </Button>
      </form>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <Select
          value={currentStatus || ALL_VALUE}
          onValueChange={(value) => updateFilters("status", value)}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_VALUE}>All Statuses</SelectItem>
            {statuses.map((status) => (
              <SelectItem key={status.value} value={status.value}>
                {status.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={currentSource || ALL_VALUE}
          onValueChange={(value) => updateFilters("source", value)}
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Source" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_VALUE}>All Sources</SelectItem>
            {sources.map((source) => (
              <SelectItem key={source.value} value={source.value}>
                {source.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <OwnerFilter
          value={currentOwner}
          onChange={(value) => updateFilters("owner", value)}
          currentUserId={currentUserId}
        />

        {hasFilters && (
          <Button variant="ghost" size="icon" onClick={clearFilters}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
