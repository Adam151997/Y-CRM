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
  ChevronLeft, ChevronRight, History,
  Plus, Edit, Trash2, Bot, User, Settings, Mic
} from "lucide-react";
import { format } from "date-fns";
import Link from "next/link";

interface PageProps {
  searchParams: Promise<{ 
    page?: string; 
    module?: string;
    action?: string;
    actorType?: string;
  }>;
}

const auditActionIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  CREATE: Plus,
  UPDATE: Edit,
  DELETE: Trash2,
  VOICE_COMMAND: Mic,
  AI_EXECUTION: Bot,
};

const auditActionColors: Record<string, string> = {
  CREATE: "text-emerald-600 bg-emerald-500/10",
  UPDATE: "text-blue-600 bg-blue-500/10",
  DELETE: "text-red-600 bg-red-500/10",
  VOICE_COMMAND: "text-violet-600 bg-violet-500/10",
  AI_EXECUTION: "text-purple-600 bg-purple-500/10",
};

const actorTypeIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  USER: User,
  AI_AGENT: Bot,
  SYSTEM: Settings,
  API: Settings,
};

export default async function AuditLogPage({ searchParams }: PageProps) {
  const { orgId } = await getAuthContext();
  const params = await searchParams;
  
  const page = parseInt(params.page || "1");
  const limit = 25;
  const skip = (page - 1) * limit;
  const moduleFilter = params.module;
  const actionFilter = params.action;
  const actorTypeFilter = params.actorType;

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

  // Fetch audit logs and filter options
  const [auditLogs, auditTotal, auditModules, auditActions, auditActorTypes] = await Promise.all([
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
  ]);

  const totalPages = Math.ceil(auditTotal / limit);

  const buildUrl = (newParams: Record<string, string | null>) => {
    const current = new URLSearchParams();
    if (params.page) current.set("page", params.page);
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
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Audit Log
              </CardTitle>
              <CardDescription>
                Complete history of all changes made in your CRM
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {/* Module Filter */}
              <Select 
                value={moduleFilter || "_all"}
                onValueChange={(value) => {
                  window.location.href = buildUrl({ module: value, page: "1" });
                }}
              >
                <SelectTrigger className="w-[130px]">
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
              
              {/* Action Filter */}
              <Select 
                value={actionFilter || "_all"}
                onValueChange={(value) => {
                  window.location.href = buildUrl({ action: value, page: "1" });
                }}
              >
                <SelectTrigger className="w-[120px]">
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

              {/* Actor Type Filter */}
              <Select 
                value={actorTypeFilter || "_all"}
                onValueChange={(value) => {
                  window.location.href = buildUrl({ actorType: value, page: "1" });
                }}
              >
                <SelectTrigger className="w-[120px]">
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
                    <TableHead>Record</TableHead>
                    <TableHead>Actor</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {auditLogs.map((log) => {
                    const ActionIcon = auditActionIcons[log.action] || Edit;
                    const ActorIcon = actorTypeIcons[log.actorType] || User;
                    const actionColor = auditActionColors[log.action] || "text-gray-600 bg-gray-500/10";
                    
                    // Get record name from newState if available
                    const newState = log.newState as Record<string, unknown> | null;
                    let recordName: string | null = null;
                    if (newState) {
                      if (typeof newState.name === 'string') recordName = newState.name;
                      else if (typeof newState.title === 'string') recordName = newState.title;
                      else if (typeof newState.subject === 'string') recordName = newState.subject;
                      else if (typeof newState.firstName === 'string') {
                        recordName = `${newState.firstName} ${typeof newState.lastName === 'string' ? newState.lastName : ''}`.trim();
                      }
                    }

                    return (
                      <TableRow key={log.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className={`p-1.5 rounded-md ${actionColor}`}>
                              <ActionIcon className="h-3.5 w-3.5" />
                            </div>
                            <span className="text-sm font-medium">{log.action}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-normal">
                            {log.module}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="max-w-[180px]">
                            {recordName && (
                              <p className="text-sm font-medium truncate">{recordName}</p>
                            )}
                            <p className="text-xs text-muted-foreground font-mono truncate">
                              {log.recordId ? log.recordId.slice(0, 8) + "..." : "—"}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <ActorIcon className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">{log.actorType}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <p>{format(new Date(log.createdAt), "MMM d, yyyy")}</p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(log.createdAt), "h:mm a")}
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
                      disabled={page >= totalPages}
                      asChild={page < totalPages}
                    >
                      {page < totalPages ? (
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
    </div>
  );
}
