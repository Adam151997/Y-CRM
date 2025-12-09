"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getWidgetsByCategory, WidgetDefinition } from "@/lib/dashboard/widget-registry";
import { WorkspaceType } from "@/lib/workspace";
import { Check } from "lucide-react";

interface AddWidgetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddWidget: (widgetType: string) => void;
  workspace: WorkspaceType;
  existingWidgets: string[];
}

const categoryLabels: Record<string, string> = {
  metrics: "Metrics",
  charts: "Charts",
  lists: "Lists",
  activity: "Activity",
};

export function AddWidgetDialog({
  open,
  onOpenChange,
  onAddWidget,
  workspace,
  existingWidgets,
}: AddWidgetDialogProps) {
  const widgetsByCategory = getWidgetsByCategory(workspace);

  const isWidgetAdded = (widgetId: string) => {
    return existingWidgets.some((w) => w === widgetId || w.startsWith(`${widgetId}-`));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Add Widget</DialogTitle>
          <DialogDescription>
            Choose a widget to add to your dashboard
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[60vh] pr-4">
          <div className="space-y-6">
            {Object.entries(widgetsByCategory).map(([category, widgets]) => (
              <div key={category}>
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  {categoryLabels[category] || category}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {widgets.map((widget: WidgetDefinition) => {
                    const added = isWidgetAdded(widget.id);
                    return (
                      <button
                        key={widget.id}
                        onClick={() => !added && onAddWidget(widget.id)}
                        disabled={added}
                        className={`
                          flex items-start gap-3 p-3 rounded-lg border text-left transition-colors
                          ${added 
                            ? "bg-muted/50 border-muted cursor-not-allowed opacity-60" 
                            : "hover:bg-accent hover:border-accent-foreground/20 cursor-pointer"
                          }
                        `}
                      >
                        <div className={`
                          p-2 rounded-md
                          ${added ? "bg-muted" : "bg-primary/10"}
                        `}>
                          <widget.icon className={`h-5 w-5 ${added ? "text-muted-foreground" : "text-primary"}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">{widget.name}</span>
                            {added && (
                              <Badge variant="secondary" className="text-xs">
                                <Check className="h-3 w-3 mr-1" />
                                Added
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                            {widget.description}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        <div className="flex justify-end pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
