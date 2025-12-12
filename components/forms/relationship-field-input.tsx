"use client";

import { useState, useEffect, useCallback } from "react";
import { Check, ChevronsUpDown, Loader2, X, Link2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

interface LookupResult {
  id: string;
  label: string;
  sublabel?: string;
}

interface RelationshipFieldInputProps {
  relatedModule: string; // "accounts", "contacts", "leads", "opportunities", or custom module slug
  value: string | null;
  onChange: (value: string | null) => void;
  placeholder?: string;
  disabled?: boolean;
  showLink?: boolean; // Show link to related record
}

export function RelationshipFieldInput({
  relatedModule,
  value,
  onChange,
  placeholder = "Select...",
  disabled = false,
  showLink = true,
}: RelationshipFieldInputProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [options, setOptions] = useState<LookupResult[]>([]);
  const [selectedLabel, setSelectedLabel] = useState<string | null>(null);
  const [selectedSublabel, setSelectedSublabel] = useState<string | null>(null);

  // Resolve the current value to a label
  useEffect(() => {
    if (!value) {
      setSelectedLabel(null);
      setSelectedSublabel(null);
      return;
    }

    const resolveValue = async () => {
      try {
        const response = await fetch("/api/lookup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ module: relatedModule, ids: [value] }),
        });

        if (response.ok) {
          const data = await response.json();
          if (data.resolved[value]) {
            setSelectedLabel(data.resolved[value].label);
            setSelectedSublabel(data.resolved[value].sublabel || null);
          }
        }
      } catch (error) {
        console.error("Failed to resolve relationship value:", error);
      }
    };

    resolveValue();
  }, [value, relatedModule]);

  // Fetch options when searching
  const fetchOptions = useCallback(async (searchTerm: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ module: relatedModule });
      if (searchTerm) {
        params.set("search", searchTerm);
      }

      const response = await fetch(`/api/lookup?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setOptions(data.results || []);
      }
    } catch (error) {
      console.error("Failed to fetch lookup options:", error);
    } finally {
      setLoading(false);
    }
  }, [relatedModule]);

  // Initial fetch when opening
  useEffect(() => {
    if (open) {
      fetchOptions(search);
    }
  }, [open, search, fetchOptions]);

  // Debounce search
  useEffect(() => {
    if (!open) return;

    const timer = setTimeout(() => {
      fetchOptions(search);
    }, 300);

    return () => clearTimeout(timer);
  }, [search, open, fetchOptions]);

  const handleSelect = (option: LookupResult) => {
    onChange(option.id);
    setSelectedLabel(option.label);
    setSelectedSublabel(option.sublabel || null);
    setOpen(false);
    setSearch("");
  };

  const handleClear = () => {
    onChange(null);
    setSelectedLabel(null);
    setSelectedSublabel(null);
  };

  // Get link to related record
  const getRecordLink = () => {
    if (!value) return null;

    const builtInModules: Record<string, string> = {
      accounts: "/accounts",
      contacts: "/contacts",
      leads: "/leads",
      opportunities: "/opportunities",
    };

    const basePath = builtInModules[relatedModule.toLowerCase()];
    if (basePath) {
      return `${basePath}/${value}`;
    }

    // Custom module
    return `/modules/${relatedModule}/${value}`;
  };

  const recordLink = getRecordLink();

  return (
    <div className="flex items-center gap-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className={cn(
              "w-full justify-between",
              !selectedLabel && "text-muted-foreground"
            )}
          >
            {selectedLabel ? (
              <div className="flex items-center gap-2 truncate">
                <Link2 className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                <span className="truncate">{selectedLabel}</span>
                {selectedSublabel && (
                  <span className="text-xs text-muted-foreground truncate">
                    ({selectedSublabel})
                  </span>
                )}
              </div>
            ) : (
              placeholder
            )}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[300px] p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput
              placeholder={`Search ${relatedModule}...`}
              value={search}
              onValueChange={setSearch}
            />
            <CommandList>
              {loading ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              ) : options.length === 0 ? (
                <CommandEmpty>No results found.</CommandEmpty>
              ) : (
                <CommandGroup>
                  {options.map((option) => (
                    <CommandItem
                      key={option.id}
                      value={option.id}
                      onSelect={() => handleSelect(option)}
                      className="cursor-pointer"
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          value === option.id ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <div className="flex flex-col">
                        <span>{option.label}</span>
                        {option.sublabel && (
                          <span className="text-xs text-muted-foreground">
                            {option.sublabel}
                          </span>
                        )}
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Clear button */}
      {value && !disabled && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-9 w-9 flex-shrink-0"
          onClick={handleClear}
        >
          <X className="h-4 w-4" />
        </Button>
      )}

      {/* Link to related record */}
      {showLink && value && recordLink && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-9 w-9 flex-shrink-0"
          asChild
        >
          <Link href={recordLink} target="_blank">
            <Link2 className="h-4 w-4" />
          </Link>
        </Button>
      )}
    </div>
  );
}

// Display-only version for showing relationship in tables/lists
interface RelationshipDisplayProps {
  relatedModule: string;
  value: string | null;
  showLink?: boolean;
}

export function RelationshipDisplay({
  relatedModule,
  value,
  showLink = true,
}: RelationshipDisplayProps) {
  const [label, setLabel] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!value) {
      setLabel(null);
      setLoading(false);
      return;
    }

    const resolveValue = async () => {
      try {
        const response = await fetch("/api/lookup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ module: relatedModule, ids: [value] }),
        });

        if (response.ok) {
          const data = await response.json();
          if (data.resolved[value]) {
            setLabel(data.resolved[value].label);
          } else {
            setLabel("Not found");
          }
        }
      } catch (error) {
        console.error("Failed to resolve relationship value:", error);
        setLabel("Error");
      } finally {
        setLoading(false);
      }
    };

    resolveValue();
  }, [value, relatedModule]);

  if (!value) {
    return <span className="text-muted-foreground">-</span>;
  }

  if (loading) {
    return <Loader2 className="h-3 w-3 animate-spin" />;
  }

  // Get link to related record
  const getRecordLink = () => {
    const builtInModules: Record<string, string> = {
      accounts: "/accounts",
      contacts: "/contacts",
      leads: "/leads",
      opportunities: "/opportunities",
    };

    const basePath = builtInModules[relatedModule.toLowerCase()];
    if (basePath) {
      return `${basePath}/${value}`;
    }

    return `/modules/${relatedModule}/${value}`;
  };

  if (showLink) {
    return (
      <Link
        href={getRecordLink()}
        className="text-primary hover:underline flex items-center gap-1"
      >
        <Link2 className="h-3 w-3" />
        {label}
      </Link>
    );
  }

  return <span>{label}</span>;
}
