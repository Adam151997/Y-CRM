import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, Phone, Mail, Calendar, Mic, FileText, CheckCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";
import prisma from "@/lib/db";

interface RecentActivityProps {
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
  CALL: "text-green-500 bg-green-500/10",
  EMAIL: "text-blue-500 bg-blue-500/10",
  MEETING: "text-purple-500 bg-purple-500/10",
  VOICE_COMMAND: "text-violet-500 bg-violet-500/10",
  NOTE: "text-yellow-500 bg-yellow-500/10",
  TASK_COMPLETED: "text-emerald-500 bg-emerald-500/10",
};

export async function RecentActivity({ orgId }: RecentActivityProps) {
  const activities = await prisma.activity.findMany({
    where: { orgId },
    orderBy: { performedAt: "desc" },
    take: 5,
    include: {
      lead: {
        select: { firstName: true, lastName: true },
      },
      contact: {
        select: { firstName: true, lastName: true },
      },
    },
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-semibold">Recent Activity</CardTitle>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/settings/activity">
            View all
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        {activities.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>No recent activity</p>
          </div>
        ) : (
          <div className="space-y-4">
            {activities.map((activity) => {
              const Icon = activityIcons[activity.type] || FileText;
              const colorClass = activityColors[activity.type] || "text-gray-500 bg-gray-500/10";
              const relatedTo = activity.lead
                ? `${activity.lead.firstName} ${activity.lead.lastName}`
                : activity.contact
                  ? `${activity.contact.firstName} ${activity.contact.lastName}`
                  : null;

              return (
                <div
                  key={activity.id}
                  className="flex items-start space-x-3"
                >
                  <div className={`p-2 rounded-lg ${colorClass}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{activity.subject}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {relatedTo && <span>→ {relatedTo}</span>}
                      <span>•</span>
                      <span>
                        {formatDistanceToNow(new Date(activity.performedAt), {
                          addSuffix: true,
                        })}
                      </span>
                    </div>
                    {activity.description && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {activity.description}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
