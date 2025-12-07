"use client";

import { Card, CardContent } from "@/components/ui/card";
import {
  Phone,
  Mail,
  Calendar,
  Mic,
  FileText,
  CheckCircle,
  Activity,
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";

interface ActivityItem {
  id: string;
  type: string;
  subject: string;
  description: string | null;
  transcript: string | null;
  duration: number | null;
  performedAt: Date;
  performedByType: string;
}

interface LeadTimelineProps {
  activities: ActivityItem[];
  leadId: string;
  orgId: string;
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
  CALL: "text-green-500 bg-green-500/10 border-green-500/20",
  EMAIL: "text-blue-500 bg-blue-500/10 border-blue-500/20",
  MEETING: "text-purple-500 bg-purple-500/10 border-purple-500/20",
  VOICE_COMMAND: "text-violet-500 bg-violet-500/10 border-violet-500/20",
  NOTE: "text-yellow-500 bg-yellow-500/10 border-yellow-500/20",
  TASK_COMPLETED: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
};

export function LeadTimeline({ activities, leadId, orgId }: LeadTimelineProps) {
  if (activities.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8 text-muted-foreground">
            <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No activity yet</p>
            <p className="text-sm">
              Activities will appear here as you interact with this lead
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Group activities by date
  const groupedActivities = activities.reduce(
    (groups, activity) => {
      const date = format(new Date(activity.performedAt), "yyyy-MM-dd");
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(activity);
      return groups;
    },
    {} as Record<string, ActivityItem[]>
  );

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="space-y-6">
          {Object.entries(groupedActivities).map(([date, items]) => (
            <div key={date}>
              <div className="sticky top-0 bg-card z-10 pb-2">
                <p className="text-xs font-medium text-muted-foreground uppercase">
                  {format(new Date(date), "EEEE, MMMM d, yyyy")}
                </p>
              </div>
              <div className="space-y-4 relative">
                {/* Timeline line */}
                <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />

                {items.map((activity, index) => {
                  const Icon = activityIcons[activity.type] || Activity;
                  const colorClass =
                    activityColors[activity.type] ||
                    "text-gray-500 bg-gray-500/10 border-gray-500/20";

                  return (
                    <div key={activity.id} className="flex gap-4 relative">
                      {/* Icon */}
                      <div
                        className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full border ${colorClass}`}
                      >
                        <Icon className="h-4 w-4" />
                      </div>

                      {/* Content */}
                      <div className="flex-1 pb-4">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm">{activity.subject}</p>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(activity.performedAt), "h:mm a")}
                          </span>
                        </div>
                        {activity.description && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {activity.description}
                          </p>
                        )}
                        {activity.transcript && (
                          <div className="mt-2 p-3 bg-muted/50 rounded-lg">
                            <p className="text-xs font-medium text-muted-foreground mb-1">
                              Transcript
                            </p>
                            <p className="text-sm">{activity.transcript}</p>
                          </div>
                        )}
                        {activity.duration && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Duration: {activity.duration} minutes
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          by{" "}
                          {activity.performedByType === "AI_AGENT"
                            ? "AI Agent"
                            : "You"}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
