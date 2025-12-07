"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, Calendar, CheckSquare, FileText } from "lucide-react";
import { format, isPast, differenceInDays } from "date-fns";

interface Opportunity {
  id: string;
  name: string;
  value: number;
  currency: string;
  probability: number;
  expectedCloseDate: Date | null;
  closedWon: boolean | null;
  account: {
    id: string;
    name: string;
  };
  _count: {
    tasks: number;
    notes: number;
  };
}

interface KanbanCardProps {
  opportunity: Opportunity;
  onDragStart: () => void;
  onDragEnd: () => void;
}

export function KanbanCard({ opportunity, onDragStart, onDragEnd }: KanbanCardProps) {
  const formatCurrency = (value: number, currency: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const getCloseDateStatus = () => {
    if (!opportunity.expectedCloseDate) return null;
    const closeDate = new Date(opportunity.expectedCloseDate);
    const daysUntil = differenceInDays(closeDate, new Date());

    if (isPast(closeDate)) {
      return { label: "Overdue", color: "text-red-500 bg-red-500/10" };
    }
    if (daysUntil <= 7) {
      return { label: `${daysUntil}d`, color: "text-orange-500 bg-orange-500/10" };
    }
    if (daysUntil <= 30) {
      return { label: `${daysUntil}d`, color: "text-yellow-500 bg-yellow-500/10" };
    }
    return { label: format(closeDate, "MMM d"), color: "text-muted-foreground bg-muted" };
  };

  const closeDateStatus = getCloseDateStatus();

  return (
    <Card
      className="cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow"
      draggable
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = "move";
        onDragStart();
      }}
      onDragEnd={onDragEnd}
    >
      <CardContent className="p-3 space-y-2">
        {/* Title & Value */}
        <div>
          <Link
            href={`/opportunities/${opportunity.id}`}
            className="font-medium text-sm hover:underline line-clamp-2"
            onClick={(e) => e.stopPropagation()}
          >
            {opportunity.name}
          </Link>
          <p className="text-lg font-bold text-primary">
            {formatCurrency(Number(opportunity.value), opportunity.currency)}
          </p>
        </div>

        {/* Account */}
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Building2 className="h-3 w-3" />
          <Link
            href={`/accounts/${opportunity.account.id}`}
            className="hover:underline truncate"
            onClick={(e) => e.stopPropagation()}
          >
            {opportunity.account.name}
          </Link>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-2">
            {opportunity._count.tasks > 0 && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <CheckSquare className="h-3 w-3" />
                {opportunity._count.tasks}
              </span>
            )}
            {opportunity._count.notes > 0 && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <FileText className="h-3 w-3" />
                {opportunity._count.notes}
              </span>
            )}
          </div>

          {closeDateStatus && (
            <Badge variant="outline" className={`text-xs ${closeDateStatus.color}`}>
              <Calendar className="h-3 w-3 mr-1" />
              {closeDateStatus.label}
            </Badge>
          )}
        </div>

        {/* Closed status */}
        {opportunity.closedWon !== null && (
          <Badge
            className={`w-full justify-center ${
              opportunity.closedWon
                ? "bg-green-500/10 text-green-500"
                : "bg-red-500/10 text-red-500"
            }`}
          >
            {opportunity.closedWon ? "Won" : "Lost"}
          </Badge>
        )}
      </CardContent>
    </Card>
  );
}
