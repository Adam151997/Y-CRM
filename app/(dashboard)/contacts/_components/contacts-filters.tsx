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

interface Account {
  id: string;
  name: string;
}

interface ContactsFiltersProps {
  accounts: Account[];
  currentAccountId?: string;
  currentQuery?: string;
  currentOwner?: string;
  currentUserId?: string;
}

const ALL_VALUE = "_all";

export function ContactsFilters({
  accounts,
  currentAccountId,
  currentQuery,
  currentOwner,
  currentUserId,
}: ContactsFiltersProps) {
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
      router.push(`/contacts?${params.toString()}`);
    });
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    updateFilters("query", query || null);
  };

  const clearFilters = () => {
    setQuery("");
    startTransition(() => {
      router.push("/contacts");
    });
  };

  const hasFilters = currentAccountId || currentQuery || currentOwner;

  return (
    <div className="flex flex-col sm:flex-row gap-4">
      {/* Search */}
      <form onSubmit={handleSearch} className="flex-1 flex gap-2">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search contacts..."
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
