"use client";

import { useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { 
  UserPlus, 
  Phone, 
  Mail, 
  FileText, 
  CheckCircle,
  MessageSquare,
  DollarSign,
  Edit,
  Trash2,
  LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Activity {
  id: string;
  type: string;
  description: string;
  createdAt: string;
  module: string;
  actorType: string;
}

const activityIcons: Record<string, LucideIcon> = {
  CREATE: UserPlus,
  UPDATE: Edit,
  DELETE: Trash2,
  CALL: Phone,
  EMAIL: Mail,
  NOTE: FileText,
  TASK_COMPLETED: CheckCircle,
  MEETING: MessageSquare,
  DEAL_WON: DollarSign,
};

const moduleColors: Record<string, string> = {
  LEAD: "text-blue-500 bg-blue-100",
  CONTACT: "text-purple-500 bg-purple-100",
  ACCOUNT: "text-green-500 bg-green-100",
  OPPORTUNITY: "text-orange-500 bg-orange-100",
  TICKET: "text-cyan-500 bg-cyan-100",
  TASK: "text-yellow-500 bg-yellow-100",
};

export function RecentActivityWidget() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch("/api/dashboard/widgets/recent-activity");
        if (response.ok) {
          const result = await response.json();
          setActivities(result.activities || []);
        }
      } catch (error) {
        console.error("Error fetching activities:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        No recent activity
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {activities.map((activity) => {
        const Icon = activityIcons[activity.type] || Edit;
        const colorClass = moduleColors[activity.module] || "text-gray-500 bg-gray-100";
        const [textColor, bgColor] = colorClass.split(" ");

        return (
          <div key={activity.id} className="flex items-start gap-3">
            <div className={cn("p-2 rounded-lg shrink-0", bgColor)}>
              <Icon className={cn("h-4 w-4", textColor)} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm">{activity.description}</p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>{formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}</span>
                <span>•</span>
                <span>{activity.module}</span>
                {activity.actorType === "AI_AGENT" && (
                  <>
                    <span>•</span>
                    <span className="text-violet-600">AI</span>
                  </>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
