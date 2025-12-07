"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ArrowRight, Mail, Building2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Lead {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  company: string | null;
  status: string;
  createdAt: Date;
  pipelineStage: {
    name: string;
    color: string | null;
  } | null;
}

interface RecentLeadsProps {
  leads: Lead[];
}

export function RecentLeads({ leads }: RecentLeadsProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-semibold">Recent Leads</CardTitle>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/leads">
            View all
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        {leads.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>No leads yet</p>
            <Button variant="link" asChild className="mt-2">
              <Link href="/leads/new">Add your first lead</Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {leads.map((lead) => (
              <Link
                key={lead.id}
                href={`/leads/${lead.id}`}
                className="flex items-center space-x-4 p-3 rounded-lg hover:bg-muted/50 transition-colors"
              >
                <Avatar>
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {lead.firstName[0]}
                    {lead.lastName[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">
                    {lead.firstName} {lead.lastName}
                  </p>
                  <div className="flex items-center text-sm text-muted-foreground space-x-2">
                    {lead.email && (
                      <span className="flex items-center truncate">
                        <Mail className="h-3 w-3 mr-1" />
                        {lead.email}
                      </span>
                    )}
                    {lead.company && (
                      <span className="flex items-center truncate">
                        <Building2 className="h-3 w-3 mr-1" />
                        {lead.company}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-end space-y-1">
                  {lead.pipelineStage && (
                    <Badge
                      variant="outline"
                      style={{
                        borderColor: lead.pipelineStage.color || undefined,
                        color: lead.pipelineStage.color || undefined,
                      }}
                    >
                      {lead.pipelineStage.name}
                    </Badge>
                  )}
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(lead.createdAt), { addSuffix: true })}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
