"use client";

import { useRouter } from "next/navigation";
import { Check, ChevronsUpDown } from "lucide-react";
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
import { useState } from "react";
import { useWorkspace, WORKSPACES, WorkspaceType } from "@/lib/workspace";

interface WorkspaceSwitcherProps {
  collapsed?: boolean;
}

export function WorkspaceSwitcher({ collapsed = false }: WorkspaceSwitcherProps) {
  const router = useRouter();
  const { workspace, config } = useWorkspace();
  const [open, setOpen] = useState(false);

  const handleSelect = (selectedWorkspace: WorkspaceType) => {
    setOpen(false);
    if (selectedWorkspace !== workspace) {
      // Navigate to the dashboard of the selected workspace
      router.push(`/${selectedWorkspace}`);
    }
  };

  if (collapsed) {
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className="h-10 w-10"
            title={config.name}
          >
            <div className={cn("h-3 w-3 rounded-full", config.bgColor)} />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[200px] p-0" align="start" side="right">
          <Command>
            <CommandList>
              <CommandGroup>
                {Object.values(WORKSPACES).map((ws) => (
                  <CommandItem
                    key={ws.key}
                    value={ws.key}
                    onSelect={() => handleSelect(ws.key)}
                    className="cursor-pointer"
                  >
                    <div className={cn("h-2.5 w-2.5 rounded-full mr-2", ws.bgColor)} />
                    <span>{ws.name}</span>
                    {workspace === ws.key && (
                      <Check className="ml-auto h-4 w-4" />
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

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          <div className="flex items-center gap-2">
            <div className={cn("h-2.5 w-2.5 rounded-full", config.bgColor)} />
            <span className="truncate">{config.name}</span>
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[220px] p-0" align="start">
        <Command>
          <CommandList>
            <CommandGroup heading="Workspaces">
              {Object.values(WORKSPACES).map((ws) => (
                <CommandItem
                  key={ws.key}
                  value={ws.key}
                  onSelect={() => handleSelect(ws.key)}
                  className="cursor-pointer"
                >
                  <div className={cn("h-2.5 w-2.5 rounded-full mr-2", ws.bgColor)} />
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
