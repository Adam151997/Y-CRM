"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  Search,
  Users,
  UserCircle,
  Building2,
  Target,
  CheckSquare,
  Ticket,
  FileText,
  X,
  Loader2,
  Command,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";

interface SearchResult {
  id: string;
  type: "lead" | "contact" | "account" | "opportunity" | "task" | "ticket" | "document" | "invoice" | "renewal" | "campaign" | "custom";
  title: string;
  subtitle: string;
  href: string;
  status?: string;
  priority?: string;
  value?: number;
}

const typeConfig = {
  lead: { icon: Users, label: "Lead", color: "bg-blue-500/10 text-blue-600" },
  contact: { icon: UserCircle, label: "Contact", color: "bg-green-500/10 text-green-600" },
  account: { icon: Building2, label: "Account", color: "bg-purple-500/10 text-purple-600" },
  opportunity: { icon: Target, label: "Opportunity", color: "bg-orange-500/10 text-orange-600" },
  task: { icon: CheckSquare, label: "Task", color: "bg-yellow-500/10 text-yellow-600" },
  ticket: { icon: Ticket, label: "Ticket", color: "bg-red-500/10 text-red-600" },
  document: { icon: FileText, label: "Document", color: "bg-gray-500/10 text-gray-600" },
  invoice: { icon: FileText, label: "Invoice", color: "bg-emerald-500/10 text-emerald-600" },
  renewal: { icon: Target, label: "Renewal", color: "bg-cyan-500/10 text-cyan-600" },
  campaign: { icon: Target, label: "Campaign", color: "bg-pink-500/10 text-pink-600" },
  custom: { icon: FileText, label: "Custom", color: "bg-indigo-500/10 text-indigo-600" },
};

export function OmniSearch() {
  const router = useRouter();
  const t = useTranslations("search");
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>();

  // Translation helper for type labels
  const getTypeLabel = (type: string): string => {
    const typeKeys: Record<string, string> = {
      lead: "types.lead",
      contact: "types.contact",
      account: "types.account",
      opportunity: "types.opportunity",
      task: "types.task",
      ticket: "types.ticket",
      document: "types.document",
      invoice: "types.invoice",
      renewal: "types.renewal",
      campaign: "types.campaign",
      custom: "types.custom",
    };
    return t(typeKeys[type] || type);
  };

  // Keyboard shortcut to open search (Cmd/Ctrl + K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen(true);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Focus input when dialog opens
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 0);
    } else {
      setQuery("");
      setResults([]);
      setSelectedIndex(0);
    }
  }, [open]);

  // Debounced search
  const search = useCallback(async (searchQuery: string) => {
    if (searchQuery.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}&limit=8`);
      if (response.ok) {
        const data = await response.json();
        setResults(data.results || []);
      }
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Handle input change with debounce
  const handleInputChange = (value: string) => {
    setQuery(value);
    setSelectedIndex(0);

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (value.length >= 2) {
      setLoading(true);
      debounceRef.current = setTimeout(() => {
        search(value);
      }, 300);
    } else {
      setResults([]);
      setLoading(false);
    }
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(results.length, 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + results.length) % Math.max(results.length, 1));
    } else if (e.key === "Enter" && results[selectedIndex]) {
      e.preventDefault();
      router.push(results[selectedIndex].href);
      setOpen(false);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  // Group results by type
  const groupedResults = results.reduce((acc, result) => {
    if (!acc[result.type]) {
      acc[result.type] = [];
    }
    acc[result.type].push(result);
    return acc;
  }, {} as Record<string, SearchResult[]>);

  // Flatten for keyboard navigation index
  const flatResults = Object.values(groupedResults).flat();

  return (
    <>
      {/* Search trigger button */}
      <button
        onClick={() => setOpen(true)}
        className="hidden md:flex items-center gap-2 h-9 px-3 rounded-md bg-secondary/50 border border-transparent hover:border-border hover:bg-background text-sm text-muted-foreground transition-colors w-64"
      >
        <Search className="h-4 w-4" />
        <span className="flex-1 text-left">{t("placeholder")}</span>
        <kbd className="hidden lg:inline-flex h-5 items-center gap-1 rounded border bg-muted px-1.5 text-[10px] font-medium text-muted-foreground">
          <Command className="h-3 w-3" />K
        </kbd>
      </button>

      {/* Mobile search button */}
      <button
        onClick={() => setOpen(true)}
        className="md:hidden flex items-center justify-center h-9 w-9 rounded-md hover:bg-secondary text-muted-foreground"
      >
        <Search className="h-4 w-4" />
      </button>

      {/* Search dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="p-0 gap-0 max-w-lg overflow-hidden">
          <VisuallyHidden>
            <DialogTitle>{t("title")}</DialogTitle>
          </VisuallyHidden>

          {/* Search input */}
          <div className="flex items-center gap-2 px-4 border-b">
            <Search className="h-4 w-4 text-muted-foreground shrink-0" />
            <Input
              ref={inputRef}
              value={query}
              onChange={(e) => handleInputChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t("inputPlaceholder")}
              className="h-12 border-0 focus-visible:ring-0 px-0 text-base"
            />
            {query && (
              <button
                onClick={() => {
                  setQuery("");
                  setResults([]);
                  inputRef.current?.focus();
                }}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
            {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          </div>

          {/* Results */}
          <div className="max-h-[400px] overflow-y-auto">
            {query.length < 2 ? (
              <div className="p-8 text-center text-muted-foreground">
                <Search className="h-10 w-10 mx-auto mb-3 opacity-50" />
                <p className="text-sm">{t("minChars")}</p>
                <p className="text-xs mt-1">{t("searchAcross")}</p>
              </div>
            ) : loading ? (
              <div className="p-8 text-center text-muted-foreground">
                <Loader2 className="h-8 w-8 mx-auto mb-3 animate-spin" />
                <p className="text-sm">{t("searching")}</p>
              </div>
            ) : results.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <Search className="h-10 w-10 mx-auto mb-3 opacity-50" />
                <p className="text-sm">{t("noResults", { query })}</p>
                <p className="text-xs mt-1">{t("tryDifferent")}</p>
              </div>
            ) : (
              <div className="py-2">
                {Object.entries(groupedResults).map(([type, items]) => {
                  const config = typeConfig[type as keyof typeof typeConfig];
                  const Icon = config?.icon || FileText;

                  return (
                    <div key={type}>
                      <div className="px-4 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        {getTypeLabel(type)}
                      </div>
                      {items.map((result) => {
                        const globalIndex = flatResults.findIndex((r) => r.id === result.id);
                        const isSelected = globalIndex === selectedIndex;

                        return (
                          <button
                            key={result.id}
                            onClick={() => {
                              router.push(result.href);
                              setOpen(false);
                            }}
                            onMouseEnter={() => setSelectedIndex(globalIndex)}
                            className={cn(
                              "w-full flex items-center gap-3 px-4 py-2 text-left transition-colors",
                              isSelected ? "bg-secondary" : "hover:bg-secondary/50"
                            )}
                          >
                            <div className={cn("p-1.5 rounded-md", config?.color)}>
                              <Icon className="h-4 w-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{result.title}</p>
                              {result.subtitle && (
                                <p className="text-xs text-muted-foreground truncate">
                                  {result.subtitle}
                                </p>
                              )}
                            </div>
                            {result.status && (
                              <Badge variant="outline" className="text-xs shrink-0">
                                {result.status}
                              </Badge>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer hint */}
          {results.length > 0 && (
            <div className="px-4 py-2 border-t bg-muted/30 text-xs text-muted-foreground flex items-center gap-4">
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 rounded bg-muted border text-[10px]">↑↓</kbd>
                {t("navigate")}
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 rounded bg-muted border text-[10px]">↵</kbd>
                {t("select")}
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 rounded bg-muted border text-[10px]">esc</kbd>
                {t("close")}
              </span>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
