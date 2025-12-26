"use client";

import { useRouter } from "next/navigation";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useState, useMemo } from "react";
import { useWorkspace, WORKSPACES, WorkspaceType } from "@/lib/workspace";
import { usePermissions } from "@/hooks/use-permissions";

interface WorkspaceSwitcherProps {
  variant?: "sidebar" | "header";
}

export function WorkspaceSwitcher({ variant = "sidebar" }: WorkspaceSwitcherProps) {
  const router = useRouter();
  const { workspace, config } = useWorkspace();
  const { canAccessWorkspace, loading: permissionsLoading, isAdmin } = usePermissions();
  const [open, setOpen] = useState(false);

  // Filter workspaces based on user permissions
  const accessibleWorkspaces = useMemo(() => {
    // While loading, show current workspace only to avoid flash
    if (permissionsLoading) {
      return [WORKSPACES[workspace]];
    }

    // Admins see all workspaces
    if (isAdmin) {
      return Object.values(WORKSPACES);
    }

    // Filter to only accessible workspaces
    return Object.values(WORKSPACES).filter((ws) => canAccessWorkspace(ws.key));
  }, [permissionsLoading, isAdmin, canAccessWorkspace, workspace]);

  const handleSelect = (selectedWorkspace: WorkspaceType) => {
    setOpen(false);
    if (selectedWorkspace !== workspace) {
      // Navigate to the dashboard of the selected workspace
      router.push(`/${selectedWorkspace}`);
    }
  };

  // Don't render switcher if user has access to only one workspace
  if (accessibleWorkspaces.length <= 1 && !permissionsLoading) {
    return null;
  }

  // Header variant - compact horizontal style
  if (variant === "header") {
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            role="combobox"
            aria-expanded={open}
            className="h-9 px-3 gap-1.5 text-sm font-medium"
          >
            <span>{config.name}</span>
            <ChevronDown className="h-3.5 w-3.5 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[220px] p-0" align="start">
          <Command>
            <CommandList>
              <CommandGroup heading="Workspaces">
                {accessibleWorkspaces.map((ws) => (
                  <CommandItem
                    key={ws.key}
                    value={ws.key}
                    onSelect={() => handleSelect(ws.key)}
                    className="cursor-pointer"
                  >
                    <div className="flex-1">
                      <p className="font-medium">{ws.name}</p>
                      <p className="text-xs text-muted-foreground">{ws.description}</p>
                    </div>
                    {workspace === ws.key && (
                      <Check className="ml-2 h-4 w-4" />
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    );
  }

  // Sidebar variant (legacy - kept for mobile/collapsed)
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          <span className="truncate">{config.name}</span>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[220px] p-0" align="start">
        <Command>
          <CommandList>
            <CommandGroup heading="Workspaces">
              {accessibleWorkspaces.map((ws) => (
                <CommandItem
                  key={ws.key}
                  value={ws.key}
                  onSelect={() => handleSelect(ws.key)}
                  className="cursor-pointer"
                >
                  <div className="flex-1">
                    <p className="font-medium">{ws.name}</p>
                    <p className="text-xs text-muted-foreground">{ws.description}</p>
                  </div>
                  {workspace === ws.key && (
                    <Check className="ml-2 h-4 w-4" />
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
