"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Phone, Mail, Calendar, Mic, FileText, CheckCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Activity {
  id: string;
  type: string;
  subject: string;
  description: string | null;
  performedAt: Date;
  performedByType: string;
}

interface LeadActivityProps {
  activities: Activity[];
}

const activityIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  CALL: Phone,
  EMAIL: Mail,
  MEETING: Calendar,
  VOICE_COMMAND: Mic,
  NOTE: FileText,
  TASK_COMPLETED: CheckCircle,
};

const activityColors: Record<string, string> = {
  CALL: "text-green-500 bg-green-500/10",
  EMAIL: "text-blue-500 bg-blue-500/10",
  MEETING: "text-purple-500 bg-purple-500/10",
  VOICE_COMMAND: "text-violet-500 bg-violet-500/10",
  NOTE: "text-yellow-500 bg-yellow-500/10",
  TASK_COMPLETED: "text-emerald-500 bg-emerald-500/10",
};

export function LeadActivity({ activities }: LeadActivityProps) {
  if (activities.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          No activity recorded yet.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="relative">
      {/* Timeline line */}
      <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />

      <div className="space-y-4">
        {activities.map((activity, index) => {
          const Icon = activityIcons[activity.type] || FileText;
          const colorClass = activityColors[activity.type] || "text-gray-500 bg-gray-500/10";

          return (
            <div key={activity.id} className="relative pl-10">
              {/* Icon */}
              <div
                className={`absolute left-0 p-2 rounded-full ${colorClass} z-10`}
              >
                <Icon className="h-4 w-4" />
              </div>

              {/* Content */}
              <Card>
                <CardContent className="py-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium">{activity.subject}</p>
                      {activity.description && (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                          {activity.description}
                        </p>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatDistanceToNow(new Date(activity.performedAt), {
                        addSuffix: true,
                      })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs text-muted-foreground">
                      {activity.performedByType === "AI_AGENT"
                        ? "AI Agent"
                        : "You"}
                    </span>
                    <span className="text-xs text-muted-foreground">•</span>
                    <span className="text-xs text-muted-foreground capitalize">
                      {activity.type.replace("_", " ").toLowerCase()}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
          );
        })}
      </div>
    </div>
  );
}
