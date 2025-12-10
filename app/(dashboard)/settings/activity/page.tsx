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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Phone, Mail, Calendar, Mic, FileText, CheckCircle, 
  ChevronLeft, ChevronRight, Activity, History,
  Ticket, AlertTriangle, PlayCircle, RefreshCw,
  Plus, Edit, Trash2, Bot, User, Settings
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import Link from "next/link";

interface PageProps {
  searchParams: Promise<{ 
    page?: string; 
    type?: string;
    workspace?: string;
    tab?: string;
    module?: string;
    action?: string;
    actorType?: string;
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

const auditActionIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  CREATE: Plus,
  UPDATE: Edit,
  DELETE: Trash2,
  VOICE_COMMAND: Mic,
  AI_EXECUTION: Bot,
};

const auditActionColors: Record<string, string> = {
  CREATE: "text-green-500 bg-green-500/10",
  UPDATE: "text-blue-500 bg-blue-500/10",
  DELETE: "text-red-500 bg-red-500/10",
  VOICE_COMMAND: "text-violet-500 bg-violet-500/10",
  AI_EXECUTION: "text-purple-500 bg-purple-500/10",
};

const actorTypeIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  USER: User,
  AI_AGENT: Bot,
  SYSTEM: Settings,
  API: Settings,
};

export default async function ActivitySettingsPage({ searchParams }: PageProps) {
  const { orgId } = await getAuthContext();
  const params = await searchParams;
  
  const page = parseInt(params.page || "1");
  const limit = 20;
  const skip = (page - 1) * limit;
  const typeFilter = params.type;
  const workspaceFilter = params.workspace;
  const activeTab = params.tab || "audit";
  const moduleFilter = params.module;
  const actionFilter = params.action;
  const actorTypeFilter = params.actorType;

  // Build where clause for activities
  const activityWhere: Record<string, unknown> = { orgId };
  if (typeFilter && typeFilter !== "_all") {
    activityWhere.type = typeFilter;
  }
  if (workspaceFilter && workspaceFilter !== "_all") {
    activityWhere.workspace = workspaceFilter;
  }

  // Build where clause for audit logs
  const auditWhere: Record<string, unknown> = { orgId };
  if (moduleFilter && moduleFilter !== "_all") {
    auditWhere.module = moduleFilter;
  }
  if (actionFilter && actionFilter !== "_all") {
    auditWhere.action = actionFilter;
  }
  if (actorTypeFilter && actorTypeFilter !== "_all") {
    auditWhere.actorType = actorTypeFilter;
  }

  // Fetch data based on active tab
  const [activities, activityTotal, activityTypes] = activeTab === "activities" 
    ? await Promise.all([
        prisma.activity.findMany({
          where: activityWhere,
          orderBy: { performedAt: "desc" },
          skip,
          take: limit,
          include: {
            lead: { select: { id: true, firstName: true, lastName: true } },
            contact: { select: { id: true, firstName: true, lastName: true } },
            account: { select: { id: true, name: true } },
          },
        }),
        prisma.activity.count({ where: activityWhere }),
        prisma.activity.groupBy({
          by: ["type"],
          where: { orgId },
        }),
      ])
    : [[], 0, []];

  const [auditLogs, auditTotal, auditModules, auditActions, auditActorTypes] = activeTab === "audit"
    ? await Promise.all([
        prisma.auditLog.findMany({
          where: auditWhere,
          orderBy: { createdAt: "desc" },
          skip,
          take: limit,
        }),
        prisma.auditLog.count({ where: auditWhere }),
        prisma.auditLog.groupBy({
          by: ["module"],
          where: { orgId },
        }),
        prisma.auditLog.groupBy({
          by: ["action"],
          where: { orgId },
        }),
        prisma.auditLog.groupBy({
          by: ["actorType"],
          where: { orgId },
        }),
      ])
    : [[], 0, [], [], []];

  const activityTotalPages = Math.ceil(activityTotal / limit);
  const auditTotalPages = Math.ceil(auditTotal / limit);

  const buildUrl = (newParams: Record<string, string | null>) => {
    const current = new URLSearchParams();
    if (params.tab) current.set("tab", params.tab);
    if (params.page) current.set("page", params.page);
    if (params.type) current.set("type", params.type);
    if (params.workspace) current.set("workspace", params.workspace);
    if (params.module) current.set("module", params.module);
    if (params.action) current.set("action", params.action);
    if (params.actorType) current.set("actorType", params.actorType);
    
    Object.entries(newParams).forEach(([key, value]) => {
      if (value === null) {
        current.delete(key);
      } else {
        current.set(key, value);
      }
    });
    
    // Reset page when changing filters
    if (!newParams.page) {
      current.set("page", "1");
    }
    
    return `/settings/activity?${current.toString()}`;
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue={activeTab} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="audit" asChild>
            <Link href={buildUrl({ tab: "audit", page: "1" })}>
              <History className="h-4 w-4 mr-2" />
              Audit Log
            </Link>
          </TabsTrigger>
          <TabsTrigger value="activities" asChild>
            <Link href={buildUrl({ tab: "activities", page: "1" })}>
              <Activity className="h-4 w-4 mr-2" />
              Activities
            </Link>
          </TabsTrigger>
        </TabsList>

        {/* Audit Log Tab */}
        <TabsContent value="audit">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <History className="h-5 w-5" />
                    Audit Log
                  </CardTitle>
                  <CardDescription>
                    Complete history of all changes made in the CRM
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  {/* Module Filter */}
                  <Link href={buildUrl({ module: "_all" })}>
                    <Select value={moduleFilter || "_all"}>
                      <SelectTrigger className="w-[140px]">
                        <SelectValue placeholder="Module" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_all">All Modules</SelectItem>
                        {auditModules.map(({ module }) => (
                          <SelectItem key={module} value={module}>
                            {module}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Link>
                  
                  {/* Action Filter */}
                  <Link href={buildUrl({ action: "_all" })}>
                    <Select value={actionFilter || "_all"}>
                      <SelectTrigger className="w-[130px]">
                        <SelectValue placeholder="Action" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_all">All Actions</SelectItem>
                        {auditActions.map(({ action }) => (
                          <SelectItem key={action} value={action}>
                            {action}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Link>

                  {/* Actor Type Filter */}
                  <Link href={buildUrl({ actorType: "_all" })}>
                    <Select value={actorTypeFilter || "_all"}>
                      <SelectTrigger className="w-[130px]">
                        <SelectValue placeholder="Actor" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_all">All Actors</SelectItem>
                        {auditActorTypes.map(({ actorType }) => (
                          <SelectItem key={actorType} value={actorType}>
                            {actorType}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Link>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {auditLogs.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No audit logs found</p>
                  {(moduleFilter || actionFilter || actorTypeFilter) && (
                    <p className="text-sm mt-1">Try adjusting your filters</p>
                  )}
                </div>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Action</TableHead>
                        <TableHead>Module</TableHead>
                        <TableHead>Record ID</TableHead>
                        <TableHead>Actor</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {auditLogs.map((log) => {
                        const ActionIcon = auditActionIcons[log.action] || Edit;
                        const ActorIcon = actorTypeIcons[log.actorType] || User;
                        const actionColor = auditActionColors[log.action] || "text-gray-500 bg-gray-500/10";
                        
                        // Get record name from newState if available
                        const newState = log.newState as Record<string, unknown> | null;
                        const recordName = newState?.name || newState?.title || newState?.firstName 
                          ? `${newState?.firstName || ""} ${newState?.lastName || ""}`.trim()
                          : null;

                        return (
                          <TableRow key={log.id}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div className={`p-1.5 rounded ${actionColor}`}>
                                  <ActionIcon className="h-3.5 w-3.5" />
                                </div>
                                <span className="text-sm font-medium">{log.action}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{log.module}</Badge>
                            </TableCell>
                            <TableCell>
                              <div className="max-w-[200px]">
                                {recordName && (
                                  <p className="text-sm font-medium truncate">{recordName}</p>
                                )}
                                <p className="text-xs text-muted-foreground font-mono truncate">
                                  {log.recordId || "—"}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <ActorIcon className="h-4 w-4 text-muted-foreground" />
                                <div>
                                  <p className="text-sm">{log.actorType}</p>
                                  {log.actorId && (
                                    <p className="text-xs text-muted-foreground truncate max-w-[100px]">
                                      {log.actorId}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm">
                                <p>{format(new Date(log.createdAt), "MMM d, yyyy")}</p>
                                <p className="text-xs text-muted-foreground">
                                  {format(new Date(log.createdAt), "HH:mm:ss")}
                                </p>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>

                  {/* Pagination */}
                  {auditTotalPages > 1 && (
                    <div className="flex items-center justify-between mt-4 pt-4 border-t">
                      <p className="text-sm text-muted-foreground">
                        Showing {skip + 1}-{Math.min(skip + limit, auditTotal)} of {auditTotal} logs
                      </p>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={page <= 1}
                          asChild={page > 1}
                        >
                          {page > 1 ? (
                            <Link href={buildUrl({ page: String(page - 1) })}>
                              <ChevronLeft className="h-4 w-4" />
                            </Link>
                          ) : (
                            <span><ChevronLeft className="h-4 w-4" /></span>
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={page >= auditTotalPages}
                          asChild={page < auditTotalPages}
                        >
                          {page < auditTotalPages ? (
                            <Link href={buildUrl({ page: String(page + 1) })}>
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
        </TabsContent>

        {/* Activities Tab */}
        <TabsContent value="activities">
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
                  <Link href={buildUrl({ workspace: "_all" })}>
                    <Select value={workspaceFilter || "_all"}>
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
                  </Link>
                  
                  {/* Type Filter */}
                  <Link href={buildUrl({ type: "_all" })}>
                    <Select value={typeFilter || "_all"}>
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
                  </Link>
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
                  {activityTotalPages > 1 && (
                    <div className="flex items-center justify-between mt-4 pt-4 border-t">
                      <p className="text-sm text-muted-foreground">
                        Showing {skip + 1}-{Math.min(skip + limit, activityTotal)} of {activityTotal} activities
                      </p>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={page <= 1}
                          asChild={page > 1}
                        >
                          {page > 1 ? (
                            <Link href={buildUrl({ page: String(page - 1) })}>
                              <ChevronLeft className="h-4 w-4" />
                            </Link>
                          ) : (
                            <span><ChevronLeft className="h-4 w-4" /></span>
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={page >= activityTotalPages}
                          asChild={page < activityTotalPages}
                        >
                          {page < activityTotalPages ? (
                            <Link href={buildUrl({ page: String(page + 1) })}>
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
        </TabsContent>
      </Tabs>
    </div>
  );
}
