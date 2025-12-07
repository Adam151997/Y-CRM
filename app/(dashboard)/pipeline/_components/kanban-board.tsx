"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { KanbanColumn } from "./kanban-column";

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

interface KanbanBoardProps {
  stages: PipelineStage[];
  opportunitiesByStage: Record<string, Opportunity[]>;
}

export function KanbanBoard({ stages, opportunitiesByStage }: KanbanBoardProps) {
  const router = useRouter();
  const [localOpportunities, setLocalOpportunities] = useState(opportunitiesByStage);
  const [draggedOpportunity, setDraggedOpportunity] = useState<Opportunity | null>(null);

  const handleDragStart = (opportunity: Opportunity) => {
    setDraggedOpportunity(opportunity);
  };

  const handleDragEnd = () => {
    setDraggedOpportunity(null);
  };

  const handleDrop = async (targetStageId: string) => {
    if (!draggedOpportunity || draggedOpportunity.stageId === targetStageId) {
      return;
    }

    const sourceStageId = draggedOpportunity.stageId;
    const targetStage = stages.find((s) => s.id === targetStageId);

    // Optimistic update
    setLocalOpportunities((prev) => {
      const updated = { ...prev };
      
      // Remove from source
      updated[sourceStageId] = updated[sourceStageId].filter(
        (opp) => opp.id !== draggedOpportunity.id
      );
      
      // Add to target
      const movedOpp = {
        ...draggedOpportunity,
        stageId: targetStageId,
        stage: targetStage!,
        probability: targetStage?.probability ?? draggedOpportunity.probability,
      };
      updated[targetStageId] = [...(updated[targetStageId] || []), movedOpp];
      
      return updated;
    });

    // API call
    try {
      const response = await fetch(`/api/opportunities/${draggedOpportunity.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stageId: targetStageId,
          probability: targetStage?.probability,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update opportunity");
      }

      toast.success(`Moved to ${targetStage?.name}`);
      router.refresh();
    } catch (error) {
      // Revert on error
      setLocalOpportunities(opportunitiesByStage);
      toast.error("Failed to move opportunity");
    }
  };

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {stages.map((stage) => (
        <KanbanColumn
          key={stage.id}
          stage={stage}
          opportunities={localOpportunities[stage.id] || []}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDrop={() => handleDrop(stage.id)}
          isDragTarget={draggedOpportunity !== null && draggedOpportunity.stageId !== stage.id}
        />
      ))}
    </div>
  );
}
