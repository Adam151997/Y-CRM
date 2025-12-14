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

interface PipelineStage {
  id: string;
  name: string;
  color: string | null;
}

interface Account {
  id: string;
  name: string;
}

interface OpportunitiesFiltersProps {
  stages: PipelineStage[];
  accounts: Account[];
  currentStageId?: string;
  currentAccountId?: string;
  currentQuery?: string;
  currentOwner?: string;
  currentUserId?: string;
}

const ALL_VALUE = "_all";

export function OpportunitiesFilters({
  stages,
  accounts,
  currentStageId,
  currentAccountId,
  currentQuery,
  currentOwner,
  currentUserId,
}: OpportunitiesFiltersProps) {
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
      router.push(`/opportunities?${params.toString()}`);
    });
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    updateFilters("query", query || null);
  };

  const clearFilters = () => {
    setQuery("");
    startTransition(() => {
      router.push("/opportunities");
    });
  };

  const hasFilters = currentStageId || currentAccountId || currentQuery || currentOwner;

  return (
    <div className="flex flex-col sm:flex-row gap-4">
      {/* Search */}
      <form onSubmit={handleSearch} className="flex-1 flex gap-2">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search opportunities..."
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
          value={currentStageId || ALL_VALUE}
          onValueChange={(value) => updateFilters("stageId", value)}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Stage" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_VALUE}>All Stages</SelectItem>
            {stages.map((stage) => (
              <SelectItem key={stage.id} value={stage.id}>
                <div className="flex items-center gap-2">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: stage.color || "#6B7280" }}
                  />
                  {stage.name}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={currentAccountId || ALL_VALUE}
          onValueChange={(value) => updateFilters("accountId", value)}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Account" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_VALUE}>All Accounts</SelectItem>
            {accounts.map((account) => (
              <SelectItem key={account.id} value={account.id}>
                {account.name}
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
