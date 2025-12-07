"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowRight, Calendar, Clock } from "lucide-react";
import { format, isToday, isTomorrow, isPast } from "date-fns";

interface Task {
  id: string;
  title: string;
  dueDate: Date | null;
  priority: string;
  status: string;
  lead: { firstName: string; lastName: string } | null;
  contact: { firstName: string; lastName: string } | null;
}

interface UpcomingTasksProps {
  tasks: Task[];
}

const priorityColors: Record<string, string> = {
  LOW: "bg-slate-500",
  MEDIUM: "bg-blue-500",
  HIGH: "bg-orange-500",
  URGENT: "bg-red-500",
};

export function UpcomingTasks({ tasks }: UpcomingTasksProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-semibold">Upcoming Tasks</CardTitle>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/tasks">
            View all
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        {tasks.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>No upcoming tasks</p>
            <Button variant="link" asChild className="mt-2">
              <Link href="/tasks/new">Create a task</Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {tasks.map((task) => (
              <div
                key={task.id}
                className="flex items-start space-x-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
              >
                <Checkbox className="mt-0.5" />
                <div className="flex-1 min-w-0">
                  <Link
                    href={`/tasks/${task.id}`}
                    className="font-medium hover:underline line-clamp-1"
                  >
                    {task.title}
                  </Link>
                  <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                    {task.dueDate && (
                      <span
                        className={`flex items-center ${
                          isPast(new Date(task.dueDate)) && task.status !== "COMPLETED"
                            ? "text-red-500"
                            : ""
                        }`}
                      >
                        {isToday(new Date(task.dueDate)) ? (
                          <Clock className="h-3 w-3 mr-1" />
                        ) : (
                          <Calendar className="h-3 w-3 mr-1" />
                        )}
                        {formatDueDate(new Date(task.dueDate))}
                      </span>
                    )}
                    {(task.lead || task.contact) && (
                      <span className="truncate">
                        →{" "}
                        {task.lead
                          ? `${task.lead.firstName} ${task.lead.lastName}`
                          : task.contact
                            ? `${task.contact.firstName} ${task.contact.lastName}`
                            : ""}
                      </span>
                    )}
                  </div>
                </div>
                <div
                  className={`w-2 h-2 rounded-full ${priorityColors[task.priority] || priorityColors.MEDIUM}`}
                  title={task.priority}
                />
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function formatDueDate(date: Date): string {
  if (isToday(date)) return "Today";
  if (isTomorrow(date)) return "Tomorrow";
  if (isPast(date)) return `Overdue: ${format(date, "MMM d")}`;
  return format(date, "MMM d");
}
