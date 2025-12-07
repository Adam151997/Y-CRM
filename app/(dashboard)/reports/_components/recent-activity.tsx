"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Plus,
  Pencil,
  Trash2,
  UserPlus,
  Target,
  CheckSquare,
  FileText,
  Activity,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface AuditLog {
  id: string;
  action: string;
  module: string;
  recordId: string | null;
  actorType: string;
  actorId: string | null;
  createdAt: Date;
  metadata: unknown;
}

interface RecentActivityProps {
  activities: AuditLog[];
}

const actionIcons: Record<string, React.ElementType> = {
  CREATE: Plus,
  UPDATE: Pencil,
  DELETE: Trash2,
  default: Activity,
};

const moduleIcons: Record<string, React.ElementType> = {
  LEAD: UserPlus,
  CONTACT: UserPlus,
  ACCOUNT: Target,
  OPPORTUNITY: Target,
  TASK: CheckSquare,
  NOTE: FileText,
  default: Activity,
};

const actionColors: Record<string, string> = {
  CREATE: "bg-green-500/10 text-green-600",
  UPDATE: "bg-blue-500/10 text-blue-600",
  DELETE: "bg-red-500/10 text-red-600",
  default: "bg-gray-500/10 text-gray-600",
};

export function RecentActivity({ activities }: RecentActivityProps) {
  const getActionIcon = (action: string) => {
    return actionIcons[action] || actionIcons.default;
  };

  const getModuleIcon = (module: string) => {
    return moduleIcons[module] || moduleIcons.default;
  };

  const getActionColor = (action: string) => {
    return actionColors[action] || actionColors.default;
  };

  const formatAction = (action: string, module: string) => {
    const actionText = action.toLowerCase().replace(/_/g, " ");
    const moduleText = module.toLowerCase().replace(/_/g, " ");
    return `${actionText} ${moduleText}`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        {activities.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            No recent activity
          </p>
        ) : (
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-4">
              {activities.map((activity) => {
                const ActionIcon = getActionIcon(activity.action);
                const ModuleIcon = getModuleIcon(activity.module);

                return (
                  <div
                    key={activity.id}
                    className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className={`p-2 rounded-lg ${getActionColor(activity.action)}`}>
                      <ActionIcon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm capitalize">
                          {formatAction(activity.action, activity.module)}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {activity.module}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                        <span>
                          {activity.actorType === "USER"
                            ? "User"
                            : activity.actorType === "AI_AGENT"
                            ? "AI Agent"
                            : activity.actorType}
                        </span>
                        <span>•</span>
                        <span>
                          {formatDistanceToNow(new Date(activity.createdAt), {
                            addSuffix: true,
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
