import { getAuthContext } from "@/lib/auth";
import prisma from "@/lib/db";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { 
  Phone, Mail, Calendar, Mic, FileText, CheckCircle, 
  ChevronLeft, ChevronRight, Activity,
  Ticket, AlertTriangle, PlayCircle, RefreshCw
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import Link from "next/link";

interface PageProps {
  searchParams: Promise<{ 
    page?: string; 
    type?: string;
    workspace?: string;
  }>;
}

const activityIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  CALL: Phone,
  EMAIL: Mail,
  MEETING: Calendar,
  VOICE_COMMAND: Mic,
  NOTE: FileText,
  TASK_COMPLETED: CheckCircle,
  TICKET_CREATED: Ticket,
  TICKET_RESOLVED: Ticket,
  HEALTH_ALERT: AlertTriangle,
  PLAYBOOK_STARTED: PlayCircle,
  PLAYBOOK_COMPLETED: CheckCircle,
  RENEWAL_UPDATED: RefreshCw,
};

const activityColors: Record<string, string> = {
  CALL: "text-green-500 bg-green-500/10",
  EMAIL: "text-blue-500 bg-blue-500/10",
  MEETING: "text-purple-500 bg-purple-500/10",
  VOICE_COMMAND: "text-violet-500 bg-violet-500/10",
  NOTE: "text-yellow-500 bg-yellow-500/10",
  TASK_COMPLETED: "text-emerald-500 bg-emerald-500/10",
  TICKET_CREATED: "text-orange-500 bg-orange-500/10",
  TICKET_RESOLVED: "text-green-500 bg-green-500/10",
  HEALTH_ALERT: "text-red-500 bg-red-500/10",
  PLAYBOOK_STARTED: "text-blue-500 bg-blue-500/10",
  PLAYBOOK_COMPLETED: "text-emerald-500 bg-emerald-500/10",
  RENEWAL_UPDATED: "text-cyan-500 bg-cyan-500/10",
};

const activityTypeLabels: Record<string, string> = {
  CALL: "Call",
  EMAIL: "Email",
  MEETING: "Meeting",
  VOICE_COMMAND: "Voice Command",
  NOTE: "Note",
  TASK_COMPLETED: "Task Completed",
  TICKET_CREATED: "Ticket Created",
  TICKET_RESOLVED: "Ticket Resolved",
  HEALTH_ALERT: "Health Alert",
  PLAYBOOK_STARTED: "Playbook Started",
  PLAYBOOK_COMPLETED: "Playbook Completed",
  RENEWAL_UPDATED: "Renewal Updated",
};

const workspaceColors: Record<string, string> = {
  sales: "bg-red-500/10 text-red-600",
  cs: "bg-blue-500/10 text-blue-600",
  marketing: "bg-orange-500/10 text-orange-600",
};

export default async function ActivitySettingsPage({ searchParams }: PageProps) {
  const { orgId } = await getAuthContext();
  const params = await searchParams;
  
  const page = parseInt(params.page || "1");
  const limit = 20;
  const skip = (page - 1) * limit;
  const typeFilter = params.type;
  const workspaceFilter = params.workspace;

  // Build where clause
  const where: Record<string, unknown> = { orgId };
  if (typeFilter && typeFilter !== "_all") {
    where.type = typeFilter;
  }
  if (workspaceFilter && workspaceFilter !== "_all") {
    where.workspace = workspaceFilter;
  }

  // Fetch activities with pagination
  const [activities, total] = await Promise.all([
    prisma.activity.findMany({
      where,
      orderBy: { performedAt: "desc" },
      skip,
      take: limit,
      include: {
        lead: { select: { id: true, firstName: true, lastName: true } },
        contact: { select: { id: true, firstName: true, lastName: true } },
        account: { select: { id: true, name: true } },
      },
    }),
    prisma.activity.count({ where }),
  ]);

  const totalPages = Math.ceil(total / limit);

  // Get unique types for filter
  const activityTypes = await prisma.activity.groupBy({
    by: ["type"],
    where: { orgId },
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Activity Log
              </CardTitle>
              <CardDescription>
                View all activities across your organization
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {/* Workspace Filter */}
              <form>
                <Select 
                  name="workspace" 
                  defaultValue={workspaceFilter || "_all"}
                >
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Workspace" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_all">All Workspaces</SelectItem>
                    <SelectItem value="sales">Sales</SelectItem>
                    <SelectItem value="cs">CS</SelectItem>
                    <SelectItem value="marketing">Marketing</SelectItem>
                  </SelectContent>
                </Select>
              </form>
              
              {/* Type Filter */}
              <form>
                <Select 
                  name="type" 
                  defaultValue={typeFilter || "_all"}
                >
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="Activity Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_all">All Types</SelectItem>
                    {activityTypes.map(({ type }) => (
                      <SelectItem key={type} value={type}>
                        {activityTypeLabels[type] || type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </form>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {activities.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No activities found</p>
              {(typeFilter || workspaceFilter) && (
                <p className="text-sm mt-1">Try adjusting your filters</p>
              )}
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Related To</TableHead>
                    <TableHead>Workspace</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activities.map((activity) => {
                    const Icon = activityIcons[activity.type] || FileText;
                    const colorClass = activityColors[activity.type] || "text-gray-500 bg-gray-500/10";
                    
                    // Determine related entity
                    let relatedTo = null;
                    let relatedLink = null;
                    if (activity.lead) {
                      relatedTo = `${activity.lead.firstName} ${activity.lead.lastName}`;
                      relatedLink = `/leads/${activity.lead.id}`;
                    } else if (activity.contact) {
                      relatedTo = `${activity.contact.firstName} ${activity.contact.lastName}`;
                      relatedLink = `/contacts/${activity.contact.id}`;
                    } else if (activity.account) {
                      relatedTo = activity.account.name;
                      relatedLink = `/accounts/${activity.account.id}`;
                    }

                    return (
                      <TableRow key={activity.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className={`p-1.5 rounded ${colorClass}`}>
                              <Icon className="h-3.5 w-3.5" />
                            </div>
                            <span className="text-sm">
                              {activityTypeLabels[activity.type] || activity.type}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{activity.subject}</p>
                            {activity.description && (
                              <p className="text-xs text-muted-foreground line-clamp-1">
                                {activity.description}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {relatedTo ? (
                            <Link 
                              href={relatedLink!}
                              className="text-sm text-primary hover:underline"
                            >
                              {relatedTo}
                            </Link>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant="secondary" 
                            className={workspaceColors[activity.workspace] || ""}
                          >
                            {activity.workspace.toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <p>{format(new Date(activity.performedAt), "MMM d, yyyy")}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(activity.performedAt), { addSuffix: true })}
                            </p>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                  <p className="text-sm text-muted-foreground">
                    Showing {skip + 1}-{Math.min(skip + limit, total)} of {total} activities
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page <= 1}
                      asChild={page > 1}
                    >
                      {page > 1 ? (
                        <Link href={`/settings/activity?page=${page - 1}${typeFilter ? `&type=${typeFilter}` : ""}${workspaceFilter ? `&workspace=${workspaceFilter}` : ""}`}>
                          <ChevronLeft className="h-4 w-4" />
                        </Link>
                      ) : (
                        <span><ChevronLeft className="h-4 w-4" /></span>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page >= totalPages}
                      asChild={page < totalPages}
                    >
                      {page < totalPages ? (
                        <Link href={`/settings/activity?page=${page + 1}${typeFilter ? `&type=${typeFilter}` : ""}${workspaceFilter ? `&workspace=${workspaceFilter}` : ""}`}>
                          <ChevronRight className="h-4 w-4" />
                        </Link>
                      ) : (
                        <span><ChevronRight className="h-4 w-4" /></span>
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
