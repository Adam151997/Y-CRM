"use client";

import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Pencil, Trash2, GripVertical, Trophy, X } from "lucide-react";
import { toast } from "sonner";

interface PipelineStage {
  id: string;
  name: string;
  order: number;
  color: string | null;
  probability: number | null;
  isWon: boolean;
  isLost: boolean;
  _count: {
    leads: number;
    opportunities: number;
  };
}

interface PipelineStagesListProps {
  stages: PipelineStage[];
  module: string;
}

export function PipelineStagesList({ stages, module }: PipelineStagesListProps) {
  const router = useRouter();

  const handleDelete = async (id: string, name: string, count: number) => {
    if (count > 0) {
      toast.error(`Cannot delete "${name}" because it has ${count} records`);
      return;
    }

    if (!confirm(`Are you sure you want to delete "${name}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/settings/pipeline-stages/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete");
      }

      toast.success("Stage deleted");
      router.refresh();
    } catch (error) {
      toast.error("Failed to delete stage");
    }
  };

  if (stages.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>No pipeline stages defined</p>
        <p className="text-sm mt-1">Click "Add Stage" to create one</p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-10"></TableHead>
          <TableHead>Stage Name</TableHead>
          <TableHead>Color</TableHead>
          <TableHead>Probability</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Records</TableHead>
          <TableHead className="w-10"></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {stages.map((stage) => {
          const recordCount =
            module === "LEAD" ? stage._count.leads : stage._count.opportunities;

          return (
            <TableRow key={stage.id}>
              <TableCell>
                <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
              </TableCell>
              <TableCell className="font-medium">{stage.name}</TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <div
                    className="w-6 h-6 rounded-full border"
                    style={{ backgroundColor: stage.color || "#6B7280" }}
                  />
                  <span className="text-xs text-muted-foreground font-mono">
                    {stage.color || "#6B7280"}
                  </span>
                </div>
              </TableCell>
              <TableCell>
                {stage.probability !== null ? (
                  <Badge variant="outline">{stage.probability}%</Badge>
                ) : (
                  <span className="text-muted-foreground">-</span>
                )}
              </TableCell>
              <TableCell>
                {stage.isWon ? (
                  <Badge className="bg-green-500/10 text-green-500">
                    <Trophy className="h-3 w-3 mr-1" />
                    Won
                  </Badge>
                ) : stage.isLost ? (
                  <Badge className="bg-red-500/10 text-red-500">
                    <X className="h-3 w-3 mr-1" />
                    Lost
                  </Badge>
                ) : (
                  <span className="text-muted-foreground text-sm">Active</span>
                )}
              </TableCell>
              <TableCell>
                <Badge variant="secondary">{recordCount}</Badge>
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>
                      <Pencil className="h-4 w-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-red-600"
                      onClick={() => handleDelete(stage.id, stage.name, recordCount)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
