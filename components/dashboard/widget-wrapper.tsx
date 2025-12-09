"use client";

import { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { GripVertical, X, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { WidgetDefinition } from "@/lib/dashboard/widget-registry";

interface WidgetWrapperProps {
  widget: WidgetDefinition;
  children: ReactNode;
  isEditing?: boolean;
  onRemove?: () => void;
  onSettings?: () => void;
  className?: string;
}

export function WidgetWrapper({
  widget,
  children,
  isEditing = false,
  onRemove,
  onSettings,
  className,
}: WidgetWrapperProps) {
  return (
    <Card className={cn("h-full flex flex-col overflow-hidden", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-4 pt-3">
        <div className="flex items-center gap-2">
          {isEditing && (
            <div className="cursor-grab active:cursor-grabbing drag-handle">
              <GripVertical className="h-4 w-4 text-muted-foreground" />
            </div>
          )}
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <widget.icon className="h-4 w-4 text-muted-foreground" />
            {widget.name}
          </CardTitle>
        </div>
        {isEditing && (
          <div className="flex items-center gap-1">
            {onSettings && (
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onSettings}>
                <Settings className="h-3 w-3" />
              </Button>
            )}
            {onRemove && (
              <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={onRemove}>
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        )}
      </CardHeader>
      <CardContent className="flex-1 px-4 pb-4 overflow-auto">
        {children}
      </CardContent>
    </Card>
  );
}
