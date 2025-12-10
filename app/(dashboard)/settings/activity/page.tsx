"use client";

import { useEffect, useState } from "react";
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
import { Skeleton } from "@/components/ui/skeleton";
import { 
  ChevronLeft, ChevronRight, History,
  Plus, Edit, Trash2, Bot, User, Settings, Mic
} from "lucide-react";
import { format } from "date-fns";

interface AuditLog {
  id: string;
  module: string;
  action: string;
  actorType: string;
  actorId: string | null;
  recordId: string | null;
  newState: Record<string, unknown> | null;
  createdAt: string;
}

interface AuditLogResponse {
  data: AuditLog[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  filters: {
    modules: string[];
    actions: string[];
    actorTypes: string[];
  };
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

export default function AuditLogPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<AuditLogResponse | null>(null);
  
  // Filters
  const [page, setPage] = useState(1);
  const [moduleFilter, setModuleFilter] = useState("_all");
  const [actionFilter, setActionFilter] = useState("_all");
  const [actorTypeFilter, setActorTypeFilter] = useState("_all");

  const fetchAuditLogs = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", "25");
      if (moduleFilter !== "_all") params.set("module", moduleFilter);
      if (actionFilter !== "_all") params.set("action", actionFilter);
      if (actorTypeFilter !== "_all") params.set("actorType", actorTypeFilter);
      
      const response = await fetch(`/api/audit-logs?${params.toString()}`);
      if (!response.ok) {
        throw new Error("Failed to fetch audit logs");
      }
      
      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditLogs();
  }, [page, moduleFilter, actionFilter, actorTypeFilter]);

  const handleFilterChange = (type: string, value: string) => {
    setPage(1); // Reset to page 1 when filter changes
    if (type === "module") setModuleFilter(value);
    if (type === "action") setActionFilter(value);
    if (type === "actorType") setActorTypeFilter(value);
  };

  const getRecordName = (newState: Record<string, unknown> | null): string | null => {
    if (!newState) return null;
    if (typeof newState.name === 'string') return newState.name;
    if (typeof newState.title === 'string') return newState.title;
    if (typeof newState.subject === 'string') return newState.subject;
    if (typeof newState.firstName === 'string') {
      return `${newState.firstName} ${typeof newState.lastName === 'string' ? newState.lastName : ''}`.trim();
    }
    return null;
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
              <Select value={moduleFilter} onValueChange={(v) => handleFilterChange("module", v)}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue placeholder="Module" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_all">All Modules</SelectItem>
                  {data?.filters.modules.map((module) => (
                    <SelectItem key={module} value={module}>
                      {module}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {/* Action Filter */}
              <Select value={actionFilter} onValueChange={(v) => handleFilterChange("action", v)}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="Action" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_all">All Actions</SelectItem>
                  {data?.filters.actions.map((action) => (
                    <SelectItem key={action} value={action}>
                      {action}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Actor Type Filter */}
              <Select value={actorTypeFilter} onValueChange={(v) => handleFilterChange("actorType", v)}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="Actor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_all">All Actors</SelectItem>
                  {data?.filters.actorTypes.map((actorType) => (
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
          {error ? (
            <div className="text-center py-12 text-destructive">
              <p>{error}</p>
              <Button variant="outline" className="mt-4" onClick={fetchAuditLogs}>
                Try Again
              </Button>
            </div>
          ) : loading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-8 w-8 rounded-md" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-24" />
                </div>
              ))}
            </div>
          ) : !data || data.data.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No audit logs found</p>
              {(moduleFilter !== "_all" || actionFilter !== "_all" || actorTypeFilter !== "_all") && (
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
                  {data.data.map((log) => {
                    const ActionIcon = auditActionIcons[log.action] || Edit;
                    const ActorIcon = actorTypeIcons[log.actorType] || User;
                    const actionColor = auditActionColors[log.action] || "text-gray-600 bg-gray-500/10";
                    const recordName = getRecordName(log.newState);

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
              {data.totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                  <p className="text-sm text-muted-foreground">
                    Showing {(page - 1) * 25 + 1}-{Math.min(page * 25, data.total)} of {data.total} logs
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page <= 1}
                      onClick={() => setPage(page - 1)}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page >= data.totalPages}
                      onClick={() => setPage(page + 1)}
                    >
                      <ChevronRight className="h-4 w-4" />
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
