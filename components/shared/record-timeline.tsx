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
  Ticket,
  PlayCircle,
  RefreshCw,
  AlertTriangle,
  UserPlus,
  Building2,
  Target,
  Trophy,
  XCircle,
} from "lucide-react";
import { format } from "date-fns";

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

interface RecordTimelineProps {
  activities: ActivityItem[];
  emptyMessage?: string;
}

const activityIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  CALL: Phone,
  EMAIL: Mail,
  MEETING: Calendar,
  VOICE_COMMAND: Mic,
  NOTE: FileText,
  TASK_COMPLETED: CheckCircle,
  TICKET_CREATED: Ticket,
  TICKET_RESOLVED: CheckCircle,
  HEALTH_ALERT: AlertTriangle,
  PLAYBOOK_STARTED: PlayCircle,
  PLAYBOOK_COMPLETED: CheckCircle,
  RENEWAL_UPDATED: RefreshCw,
  LEAD_CREATED: UserPlus,
  LEAD_CONVERTED: Trophy,
  CONTACT_CREATED: UserPlus,
  ACCOUNT_CREATED: Building2,
  OPPORTUNITY_CREATED: Target,
  OPPORTUNITY_WON: Trophy,
  OPPORTUNITY_LOST: XCircle,
};

const activityColors: Record<string, string> = {
  CALL: "text-green-500 bg-green-500/10 border-green-500/20",
  EMAIL: "text-blue-500 bg-blue-500/10 border-blue-500/20",
  MEETING: "text-purple-500 bg-purple-500/10 border-purple-500/20",
  VOICE_COMMAND: "text-violet-500 bg-violet-500/10 border-violet-500/20",
  NOTE: "text-yellow-500 bg-yellow-500/10 border-yellow-500/20",
  TASK_COMPLETED: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
  TICKET_CREATED: "text-orange-500 bg-orange-500/10 border-orange-500/20",
  TICKET_RESOLVED: "text-green-500 bg-green-500/10 border-green-500/20",
  HEALTH_ALERT: "text-red-500 bg-red-500/10 border-red-500/20",
  PLAYBOOK_STARTED: "text-indigo-500 bg-indigo-500/10 border-indigo-500/20",
  PLAYBOOK_COMPLETED: "text-teal-500 bg-teal-500/10 border-teal-500/20",
  RENEWAL_UPDATED: "text-cyan-500 bg-cyan-500/10 border-cyan-500/20",
  LEAD_CREATED: "text-blue-500 bg-blue-500/10 border-blue-500/20",
  LEAD_CONVERTED: "text-green-500 bg-green-500/10 border-green-500/20",
  CONTACT_CREATED: "text-indigo-500 bg-indigo-500/10 border-indigo-500/20",
  ACCOUNT_CREATED: "text-purple-500 bg-purple-500/10 border-purple-500/20",
  OPPORTUNITY_CREATED: "text-amber-500 bg-amber-500/10 border-amber-500/20",
  OPPORTUNITY_WON: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
  OPPORTUNITY_LOST: "text-red-500 bg-red-500/10 border-red-500/20",
};

export function RecordTimeline({ activities, emptyMessage = "No activity yet" }: RecordTimelineProps) {
  if (activities.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8 text-muted-foreground">
            <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>{emptyMessage}</p>
            <p className="text-sm">
              Activities will appear here as you interact with this record
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

                {items.map((activity) => {
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
