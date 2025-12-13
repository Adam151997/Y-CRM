"use client";

import { useRouter, useSearchParams } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, X } from "lucide-react";
import { INVOICE_STATUSES } from "@/lib/validation/invoices";

const STATUS_OPTIONS = [
  { value: "_all", label: "All Statuses" },
  { value: "DRAFT", label: "Draft" },
  { value: "SENT", label: "Sent" },
  { value: "VIEWED", label: "Viewed" },
  { value: "PAID", label: "Paid" },
  { value: "PARTIALLY_PAID", label: "Partially Paid" },
  { value: "OVERDUE", label: "Overdue" },
  { value: "CANCELLED", label: "Cancelled" },
  { value: "VOID", label: "Void" },
];

interface InvoicesFiltersProps {
  accounts?: { id: string; name: string }[];
}

export function InvoicesFilters({ accounts = [] }: InvoicesFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentStatus = searchParams.get("status") || "_all";
  const currentAccount = searchParams.get("accountId") || "_all";
  const currentSearch = searchParams.get("search") || "";

  const updateFilters = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    
    if (value && value !== "_all") {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    
    // Reset to page 1 when filters change
    params.delete("page");
    
    router.push(`?${params.toString()}`);
  };

  const clearFilters = () => {
    router.push("/sales/invoices");
  };

  const hasActiveFilters = currentStatus !== "_all" || currentAccount !== "_all" || currentSearch;

  return (
    <div className="flex flex-wrap gap-4 items-center">
      {/* Search */}
      <div className="relative flex-1 min-w-[200px] max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search invoices..."
          value={currentSearch}
          onChange={(e) => updateFilters("search", e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Status filter */}
      <Select
        value={currentStatus}
        onValueChange={(value) => updateFilters("status", value)}
      >
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          {STATUS_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Account filter */}
      {accounts.length > 0 && (
        <Select
          value={currentAccount}
          onValueChange={(value) => updateFilters("accountId", value)}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="All Accounts" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">All Accounts</SelectItem>
            {accounts.map((account) => (
              <SelectItem key={account.id} value={account.id}>
                {account.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* Clear filters */}
      {hasActiveFilters && (
        <Button variant="ghost" size="sm" onClick={clearFilters}>
          <X className="h-4 w-4 mr-1" />
          Clear
        </Button>
      )}
    </div>
  );
}
