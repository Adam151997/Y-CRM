"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { KanbanCard } from "./kanban-card";

interface PipelineStage {
  id: string;
  name: string;
  color: string | null;
  probability: number | null;
  isWon: boolean;
  isLost: boolean;
}

interface Opportunity {
  id: string;
  name: string;
  value: number;
  currency: string;
  probability: number;
  expectedCloseDate: Date | null;
  closedWon: boolean | null;
  stageId: string;
  account: {
    id: string;
    name: string;
  };
  stage: PipelineStage;
  _count: {
    tasks: number;
    notes: number;
  };
}

interface KanbanColumnProps {
  stage: PipelineStage;
  opportunities: Opportunity[];
  onDragStart: (opportunity: Opportunity) => void;
  onDragEnd: () => void;
  onDrop: () => void;
  isDragTarget: boolean;
}

export function KanbanColumn({
  stage,
  opportunities,
  onDragStart,
  onDragEnd,
  onDrop,
  isDragTarget,
}: KanbanColumnProps) {
  const [isDragOver, setIsDragOver] = useState(false);

  const totalValue = opportunities.reduce((sum, opp) => sum + Number(opp.value), 0);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (isDragTarget) {
      setIsDragOver(true);
    }
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    onDrop();
  };

  return (
    <div
      className={cn(
        "flex-shrink-0 w-80 bg-muted/30 rounded-lg transition-colors",
        isDragOver && "bg-primary/10 ring-2 ring-primary ring-dashed"
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Column Header */}
      <div className="p-3 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: stage.color || "#6B7280" }}
            />
            <h3 className="font-semibold">{stage.name}</h3>
            <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
              {opportunities.length}
            </span>
          </div>
        </div>
        <div className="text-sm text-muted-foreground mt-1">
          ${totalValue.toLocaleString()}
          {stage.probability !== null && (
            <span className="ml-2">• {stage.probability}%</span>
          )}
        </div>
      </div>

      {/* Cards */}
      <div className="p-2 space-y-2 min-h-[200px] max-h-[calc(100vh-300px)] overflow-y-auto">
        {opportunities.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            No opportunities
          </div>
        ) : (
          opportunities.map((opportunity) => (
            <KanbanCard
              key={opportunity.id}
              opportunity={opportunity}
              onDragStart={() => onDragStart(opportunity)}
              onDragEnd={onDragEnd}
            />
          ))
        )}
      </div>
    </div>
  );
}
