"use client";

import { cn } from "@/lib/utils";
import { Check, X } from "lucide-react";

interface PipelineStage {
  id: string;
  name: string;
  order: number;
  color: string | null;
  isWon: boolean;
  isLost: boolean;
}

interface OpportunityTimelineProps {
  stages: PipelineStage[];
  currentStageId: string;
  closedWon: boolean | null;
}

export function OpportunityTimeline({
  stages,
  currentStageId,
  closedWon,
}: OpportunityTimelineProps) {
  // Sort stages by order
  const sortedStages = [...stages].sort((a, b) => a.order - b.order);
  
  // Find current stage index
  const currentStageIndex = sortedStages.findIndex((s) => s.id === currentStageId);
  
  // Filter out won/lost stages for display unless it's the current stage
  const displayStages = sortedStages.filter((stage) => {
    if (stage.id === currentStageId) return true;
    if (stage.isWon || stage.isLost) return false;
    return true;
  });

  // Check if deal is closed
  const isClosed = closedWon !== null;
  const isWon = closedWon === true;
  const isLost = closedWon === false;

  return (
    <div className="relative">
      {/* Progress line */}
      <div className="absolute top-4 left-0 right-0 h-1 bg-muted rounded-full" />
      
      {/* Completed progress */}
      <div
        className="absolute top-4 left-0 h-1 rounded-full transition-all duration-500"
        style={{
          width: isClosed
            ? "100%"
            : `${((currentStageIndex + 1) / displayStages.length) * 100}%`,
          backgroundColor: isClosed
            ? isWon
              ? "#22c55e"
              : "#ef4444"
            : "#6366f1",
        }}
      />

      {/* Stage markers */}
      <div className="relative flex justify-between">
        {displayStages.map((stage, index) => {
          const isCompleted = index < currentStageIndex || isClosed;
          const isCurrent = stage.id === currentStageId;
          const stageColor = stage.color || "#6B7280";

          return (
            <div
              key={stage.id}
              className="flex flex-col items-center"
              style={{ width: `${100 / displayStages.length}%` }}
            >
              {/* Marker */}
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all",
                  isCompleted || isCurrent
                    ? "border-transparent"
                    : "border-muted bg-background"
                )}
                style={{
                  backgroundColor:
                    isCompleted || isCurrent
                      ? isClosed
                        ? isWon
                          ? "#22c55e"
                          : "#ef4444"
                        : stageColor
                      : undefined,
                }}
              >
                {isClosed && stage.isWon ? (
                  <Check className="h-4 w-4 text-white" />
                ) : isClosed && stage.isLost ? (
                  <X className="h-4 w-4 text-white" />
                ) : isCompleted ? (
                  <Check className="h-4 w-4 text-white" />
                ) : isCurrent ? (
                  <div className="w-3 h-3 rounded-full bg-white" />
                ) : (
                  <div className="w-2 h-2 rounded-full bg-muted" />
                )}
              </div>

              {/* Label */}
              <span
                className={cn(
                  "mt-2 text-xs text-center truncate max-w-full px-1",
                  isCurrent ? "font-medium text-foreground" : "text-muted-foreground"
                )}
              >
                {stage.name}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
