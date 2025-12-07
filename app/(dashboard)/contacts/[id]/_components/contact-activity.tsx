"use client";

import { Card, CardContent } from "@/components/ui/card";
import {
  Phone,
  Mail,
  Calendar,
  Mic,
  FileText,
  CheckCircle,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Activity {
  id: string;
  type: string;
  subject: string;
  description: string | null;
  duration: number | null;
  performedAt: Date;
  performedByType: string;
}

interface ContactActivityProps {
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

export function ContactActivity({ activities }: ContactActivityProps) {
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
    <div className="space-y-4">
      {activities.map((activity, index) => {
        const Icon = activityIcons[activity.type] || FileText;
        const colorClass =
          activityColors[activity.type] || "text-gray-500 bg-gray-500/10";

        return (
          <div key={activity.id} className="flex gap-4">
            {/* Timeline connector */}
            <div className="flex flex-col items-center">
              <div className={`p-2 rounded-full ${colorClass}`}>
                <Icon className="h-4 w-4" />
              </div>
              {index < activities.length - 1 && (
                <div className="w-px flex-1 bg-border my-2" />
              )}
            </div>

            {/* Content */}
            <div className="flex-1 pb-4">
              <div className="flex items-center gap-2">
                <p className="font-medium text-sm">{activity.subject}</p>
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(activity.performedAt), {
                    addSuffix: true,
                  })}
                </span>
              </div>
              {activity.description && (
                <p className="text-sm text-muted-foreground mt-1">
                  {activity.description}
                </p>
              )}
              {activity.duration && (
                <p className="text-xs text-muted-foreground mt-1">
                  Duration: {activity.duration} min
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
