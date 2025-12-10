"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { X } from "lucide-react";

interface TasksFiltersProps {
  currentStatus?: string;
  currentPriority?: string;
  currentView: string;
}

const statuses = [
  { value: "PENDING", label: "Pending" },
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CANCELLED", label: "Cancelled" },
];

const priorities = [
  { value: "LOW", label: "Low" },
  { value: "MEDIUM", label: "Medium" },
  { value: "HIGH", label: "High" },
  { value: "URGENT", label: "Urgent" },
];

const ALL_VALUE = "_all";

export function TasksFilters({
  currentStatus,
  currentPriority,
  currentView,
}: TasksFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const updateFilters = (key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams.toString());

    // For status and priority, keep "_all" in URL to distinguish from default
    if (key === "status" || key === "priority") {
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    } else {
      // For other params (like view), remove if "_all" or null
      if (value && value !== ALL_VALUE) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    }

    startTransition(() => {
      router.push(`/tasks?${params.toString()}`);
    });
  };

  const clearFilters = () => {
    startTransition(() => {
      router.push("/tasks");
    });
  };

  // Has filters if any explicit filter is set (including _all for status/priority)
  const hasFilters = currentStatus || currentPriority || currentView !== "all";

  return (
    <div className="space-y-4">
      {/* View Tabs */}
      <Tabs value={currentView} onValueChange={(value) => updateFilters("view", value === "all" ? null : value)}>
        <TabsList>
          <TabsTrigger value="all">All Tasks</TabsTrigger>
          <TabsTrigger value="my">My Tasks</TabsTrigger>
          <TabsTrigger value="overdue">Overdue</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <Select
          value={currentStatus || "default"}
          onValueChange={(value) => updateFilters("status", value === "default" ? null : value)}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="default">Active (Default)</SelectItem>
            <SelectItem value={ALL_VALUE}>All Statuses</SelectItem>
            {statuses.map((status) => (
              <SelectItem key={status.value} value={status.value}>
                {status.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={currentPriority || ALL_VALUE}
          onValueChange={(value) => updateFilters("priority", value === ALL_VALUE ? null : value)}
        >
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_VALUE}>All Priorities</SelectItem>
            {priorities.map((priority) => (
              <SelectItem key={priority.value} value={priority.value}>
                {priority.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {hasFilters && (
          <Button variant="ghost" size="icon" onClick={clearFilters}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
