"use client";

import { useState } from "react";
import { DynamicSidebar } from "./dynamic-sidebar";
import { cn } from "@/lib/utils";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";

export function MobileSidebar() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Mobile menu button */}
      <div className="lg:hidden fixed top-3 left-3 z-50">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setOpen(true)}
          className="bg-background/80 backdrop-blur-sm"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </div>

      {/* Mobile sidebar overlay */}
      <div
        className={cn(
          "fixed inset-0 z-50 lg:hidden transition-opacity duration-200",
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
      >
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black/50"
          onClick={() => setOpen(false)}
        />
        {/* Sidebar */}
        <div
          className={cn(
            "fixed inset-y-0 left-0 w-64 bg-background transform transition-transform duration-200",
            open ? "translate-x-0" : "-translate-x-full"
          )}
        >
          <DynamicSidebar onNavigate={() => setOpen(false)} />
        </div>
      </div>
    </>
  );
}
