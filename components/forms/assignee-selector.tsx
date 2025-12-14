"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { User } from "lucide-react";

interface TeamMember {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  imageUrl: string | null;
}

// Cache for team members to avoid repeated API calls
let teamMembersCache: TeamMember[] | null = null;
let teamMembersCachePromise: Promise<TeamMember[]> | null = null;

async function fetchTeamMembers(): Promise<TeamMember[]> {
  // Return cached data if available
  if (teamMembersCache) {
    return teamMembersCache;
  }

  // Return existing promise if fetch is in progress
  if (teamMembersCachePromise) {
    return teamMembersCachePromise;
  }

  // Start new fetch
  const fetchPromise: Promise<TeamMember[]> = (async (): Promise<TeamMember[]> => {
    try {
      const response = await fetch("/api/team");
      if (!response.ok) throw new Error("Failed to fetch team");
      const data = await response.json();
      const members: TeamMember[] = data.members || [];
      teamMembersCache = members;
      return members;
    } catch (error) {
      console.error("Failed to fetch team members:", error);
      teamMembersCachePromise = null;
      return [];
    }
  })();

  teamMembersCachePromise = fetchPromise;
  return fetchPromise;
}

// Export function to clear cache when team membership changes
export function clearTeamMembersCache() {
  teamMembersCache = null;
  teamMembersCachePromise = null;
}

const UNASSIGNED_VALUE = "__unassigned__";

interface AssigneeSelectorProps {
  value?: string | null;
  onChange: (value: string | null) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function AssigneeSelector({
  value,
  onChange,
  disabled = false,
  placeholder = "Select assignee",
}: AssigneeSelectorProps) {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>(teamMembersCache || []);
  const [isLoading, setIsLoading] = useState(!teamMembersCache);

  useEffect(() => {
    let mounted = true;

    fetchTeamMembers().then((members) => {
      if (mounted) {
        setTeamMembers(members);
        setIsLoading(false);
      }
    });

    return () => {
      mounted = false;
    };
  }, []);

  const getInitials = useCallback((member: TeamMember) => {
    if (member.firstName && member.lastName) {
      return `${member.firstName[0]}${member.lastName[0]}`.toUpperCase();
    }
    return member.email[0].toUpperCase();
  }, []);

  const getDisplayName = useCallback((member: TeamMember) => {
    if (member.firstName && member.lastName) {
      return `${member.firstName} ${member.lastName}`;
    }
    return member.email;
  }, []);

  // Convert null/undefined to our special unassigned value for the Select
  const selectValue = value || UNASSIGNED_VALUE;

  // Find the selected member for display
  const selectedMember = useMemo(() => {
    if (!value) return null;
    return teamMembers.find((m) => m.id === value) || null;
  }, [value, teamMembers]);

  const handleValueChange = useCallback((newValue: string) => {
    // Convert our special unassigned value back to null
    onChange(newValue === UNASSIGNED_VALUE ? null : newValue);
  }, [onChange]);

  if (isLoading) {
    return <Skeleton className="h-10 w-full" />;
  }

  return (
    <Select
      value={selectValue}
      onValueChange={handleValueChange}
      disabled={disabled}
    >
      <SelectTrigger>
        <SelectValue placeholder={placeholder}>
          {selectedMember ? (
            <div className="flex items-center gap-2">
              <Avatar className="h-5 w-5">
                <AvatarImage src={selectedMember.imageUrl || undefined} />
                <AvatarFallback className="text-[10px]">
                  {getInitials(selectedMember)}
                </AvatarFallback>
              </Avatar>
              <span>{getDisplayName(selectedMember)}</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-muted-foreground">
              <div className="h-5 w-5 rounded-full bg-muted flex items-center justify-center">
                <User className="h-3 w-3" />
              </div>
              <span>Unassigned</span>
            </div>
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={UNASSIGNED_VALUE}>
          <div className="flex items-center gap-2">
            <div className="h-5 w-5 rounded-full bg-muted flex items-center justify-center">
              <User className="h-3 w-3 text-muted-foreground" />
            </div>
            <span className="text-muted-foreground">Unassigned</span>
          </div>
        </SelectItem>
        {teamMembers.map((member) => (
          <SelectItem key={member.id} value={member.id}>
            <div className="flex items-center gap-2">
              <Avatar className="h-5 w-5">
                <AvatarImage src={member.imageUrl || undefined} />
                <AvatarFallback className="text-[10px]">
                  {getInitials(member)}
                </AvatarFallback>
              </Avatar>
              <span>{getDisplayName(member)}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

interface AssigneeDisplayProps {
  assigneeId?: string | null;
  className?: string;
  showUnassigned?: boolean;
}

export function AssigneeDisplay({
  assigneeId,
  className,
  showUnassigned = true,
}: AssigneeDisplayProps) {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>(teamMembersCache || []);
  const [isLoading, setIsLoading] = useState(!teamMembersCache);

  useEffect(() => {
    let mounted = true;

    fetchTeamMembers().then((members) => {
      if (mounted) {
        setTeamMembers(members);
        setIsLoading(false);
      }
    });

    return () => {
      mounted = false;
    };
  }, []);

  const member = useMemo(() => {
    if (!assigneeId) return null;
    return teamMembers.find((m) => m.id === assigneeId) || null;
  }, [assigneeId, teamMembers]);

  if (isLoading) {
    return <Skeleton className="h-6 w-24" />;
  }

  if (!assigneeId || !member) {
    if (!showUnassigned) return null;
    return (
      <div className={`flex items-center gap-2 text-muted-foreground ${className || ""}`}>
        <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center">
          <User className="h-3 w-3" />
        </div>
        <span className="text-sm">Unassigned</span>
      </div>
    );
  }

  const getInitials = () => {
    if (member.firstName && member.lastName) {
      return `${member.firstName[0]}${member.lastName[0]}`.toUpperCase();
    }
    return member.email[0].toUpperCase();
  };

  const getDisplayName = () => {
    if (member.firstName && member.lastName) {
      return `${member.firstName} ${member.lastName}`;
    }
    return member.email;
  };

  return (
    <div className={`flex items-center gap-2 ${className || ""}`}>
      <Avatar className="h-6 w-6">
        <AvatarImage src={member.imageUrl || undefined} />
        <AvatarFallback className="text-[10px]">{getInitials()}</AvatarFallback>
      </Avatar>
      <span className="text-sm">{getDisplayName()}</span>
    </div>
  );
}
