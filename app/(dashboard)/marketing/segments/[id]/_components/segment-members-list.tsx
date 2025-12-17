"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, UserPlus, Mail, Building2, Loader2 } from "lucide-react";
import Link from "next/link";

interface Member {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  company?: string | null;
  status?: string;
  account?: {
    name: string;
  } | null;
}

interface SegmentMembersListProps {
  segmentId: string;
  targetEntity: "CONTACT" | "LEAD";
  memberCount: number;
}

export function SegmentMembersList({ segmentId, targetEntity, memberCount }: SegmentMembersListProps) {
  const [members, setMembers] = useState<Member[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    async function fetchMembers() {
      try {
        const response = await fetch(`/api/marketing/segments/${segmentId}/members?limit=${showAll ? 100 : 10}`);
        if (response.ok) {
          const data = await response.json();
          setMembers(data.members);
        }
      } catch (error) {
        console.error("Error fetching members:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchMembers();
  }, [segmentId, showAll]);

  const isLeadSegment = targetEntity === "LEAD";
  const Icon = isLeadSegment ? UserPlus : Users;
  const entityLabel = isLeadSegment ? "Leads" : "Contacts";
  const detailUrl = isLeadSegment ? "/leads" : "/contacts";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Icon className="h-5 w-5" />
          Segment Members
        </CardTitle>
        <CardDescription>
          {memberCount > 0 
            ? `${memberCount.toLocaleString()} ${entityLabel.toLowerCase()} in this segment`
            : `No ${entityLabel.toLowerCase()} match this segment`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : members.length > 0 ? (
          <div className="space-y-3">
            {members.map((member) => (
              <Link
                key={member.id}
                href={`${detailUrl}/${member.id}`}
                className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <Icon className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <div className="font-medium">
                      {member.firstName} {member.lastName}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      {member.email && (
                        <span className="flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {member.email}
                        </span>
                      )}
                      {(member.company || member.account?.name) && (
                        <span className="flex items-center gap-1">
                          <Building2 className="h-3 w-3" />
                          {member.company || member.account?.name}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                {member.status && (
                  <Badge variant="outline">{member.status}</Badge>
                )}
              </Link>
            ))}

            {memberCount > members.length && !showAll && (
              <Button
                variant="ghost"
                className="w-full"
                onClick={() => setShowAll(true)}
              >
                Show more ({memberCount - members.length} remaining)
              </Button>
            )}

            {showAll && memberCount > 100 && (
              <p className="text-center text-sm text-muted-foreground">
                Showing first 100 of {memberCount.toLocaleString()} members
              </p>
            )}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Icon className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No members in this segment</p>
            <p className="text-sm">
              {targetEntity === "LEAD" 
                ? "Add rules or recalculate to find matching leads"
                : "Add rules or recalculate to find matching contacts"}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
