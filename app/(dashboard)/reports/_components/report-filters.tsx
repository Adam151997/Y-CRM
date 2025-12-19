"use client";

import { useState } from "react";
import { format, subDays, startOfMonth, endOfMonth, subMonths, startOfQuarter, startOfYear } from "date-fns";
import { Calendar as CalendarIcon, ChevronDown, Download, FileJson, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { DateRange } from "react-day-picker";

export type DatePreset = 
  | "today"
  | "yesterday"
  | "last7days"
  | "last30days"
  | "thisMonth"
  | "lastMonth"
  | "thisQuarter"
  | "lastQuarter"
  | "thisYear"
  | "lastYear"
  | "allTime"
  | "custom";

export type ExportType = "summary" | "leads" | "opportunities" | "invoices" | "tasks" | "activities";

interface ReportFiltersProps {
  preset: DatePreset;
  dateRange: DateRange | undefined;
  onPresetChange: (preset: DatePreset) => void;
  onDateRangeChange: (range: DateRange | undefined) => void;
  onExport: (type: ExportType, format: "csv" | "json") => void;
  isLoading?: boolean;
}

const PRESETS: { value: DatePreset; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "last7days", label: "Last 7 Days" },
  { value: "last30days", label: "Last 30 Days" },
  { value: "thisMonth", label: "This Month" },
  { value: "lastMonth", label: "Last Month" },
  { value: "thisQuarter", label: "This Quarter" },
  { value: "lastQuarter", label: "Last Quarter" },
  { value: "thisYear", label: "This Year" },
  { value: "lastYear", label: "Last Year" },
  { value: "allTime", label: "All Time" },
];

const EXPORT_TYPES: { value: ExportType; label: string }[] = [
  { value: "summary", label: "Summary Report" },
  { value: "leads", label: "Leads Data" },
  { value: "opportunities", label: "Opportunities Data" },
  { value: "invoices", label: "Invoices Data" },
  { value: "tasks", label: "Tasks Data" },
  { value: "activities", label: "Activities Data" },
];

export function getDateRangeFromPreset(preset: DatePreset): DateRange {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  switch (preset) {
    case "today":
      return { from: today, to: today };
    case "yesterday":
      const yesterday = subDays(today, 1);
      return { from: yesterday, to: yesterday };
    case "last7days":
      return { from: subDays(today, 6), to: today };
    case "last30days":
      return { from: subDays(today, 29), to: today };
    case "thisMonth":
      return { from: startOfMonth(now), to: now };
    case "lastMonth":
      const lastMonth = subMonths(now, 1);
      return { from: startOfMonth(lastMonth), to: endOfMonth(lastMonth) };
    case "thisQuarter":
      return { from: startOfQuarter(now), to: now };
    case "lastQuarter":
      const lastQuarter = subMonths(startOfQuarter(now), 3);
      return { from: lastQuarter, to: subDays(startOfQuarter(now), 1) };
    case "thisYear":
      return { from: startOfYear(now), to: now };
    case "lastYear":
      const lastYear = new Date(now.getFullYear() - 1, 0, 1);
      return { from: lastYear, to: new Date(now.getFullYear() - 1, 11, 31) };
    case "allTime":
    default:
      return { from: new Date(2020, 0, 1), to: now };
  }
}

export function ReportFilters({
  preset,
  dateRange,
  onPresetChange,
  onDateRangeChange,
  onExport,
  isLoading,
}: ReportFiltersProps) {
  const [calendarOpen, setCalendarOpen] = useState(false);

  const handlePresetSelect = (newPreset: DatePreset) => {
    onPresetChange(newPreset);
    if (newPreset !== "custom") {
      onDateRangeChange(getDateRangeFromPreset(newPreset));
    }
  };

  const handleCalendarSelect = (range: DateRange | undefined) => {
    onDateRangeChange(range);
    if (range?.from && range?.to) {
      onPresetChange("custom");
    }
  };

  const formatDateRange = () => {
    if (!dateRange?.from) return "Select date range";
    if (!dateRange.to) return format(dateRange.from, "MMM d, yyyy");
    return `${format(dateRange.from, "MMM d, yyyy")} - ${format(dateRange.to, "MMM d, yyyy")}`;
  };

  const currentPresetLabel = PRESETS.find(p => p.value === preset)?.label || "Custom";

  return (
    <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
      {/* Preset Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="w-[160px] justify-between" disabled={isLoading}>
            {currentPresetLabel}
            <ChevronDown className="h-4 w-4 ml-2 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-[160px]">
          {PRESETS.map((p) => (
            <DropdownMenuItem
              key={p.value}
              onClick={() => handlePresetSelect(p.value)}
              className={cn(preset === p.value && "bg-accent")}
            >
              {p.label}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => {
              onPresetChange("custom");
              setCalendarOpen(true);
            }}
            className={cn(preset === "custom" && "bg-accent")}
          >
            Custom Range
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Date Range Picker */}
      <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "w-[280px] justify-start text-left font-normal",
              !dateRange && "text-muted-foreground"
            )}
            disabled={isLoading}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {formatDateRange()}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={dateRange?.from}
            selected={dateRange}
            onSelect={handleCalendarSelect}
            numberOfMonths={2}
          />
        </PopoverContent>
      </Popover>

      {/* Export Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" disabled={isLoading}>
            <Download className="h-4 w-4 mr-2" />
            Export
            <ChevronDown className="h-4 w-4 ml-2 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-[200px]">
          {EXPORT_TYPES.map((type) => (
            <DropdownMenuItem
              key={type.value}
              className="flex items-center justify-between"
              onClick={() => {}}
            >
              <span>{type.label}</span>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={(e) => {
                    e.stopPropagation();
                    onExport(type.value, "csv");
                  }}
                  title="Export as CSV"
                >
                  <FileSpreadsheet className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={(e) => {
                    e.stopPropagation();
                    onExport(type.value, "json");
                  }}
                  title="Export as JSON"
                >
                  <FileJson className="h-3 w-3" />
                </Button>
              </div>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
