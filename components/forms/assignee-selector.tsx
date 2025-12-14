"use client";

import { useEffect, useState } from "react";
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
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchTeamMembers = async () => {
      try {
        const response = await fetch("/api/team");
        if (response.ok) {
          const data = await response.json();
          setTeamMembers(data.members || []);
        }
      } catch (error) {
        console.error("Failed to fetch team members:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTeamMembers();
  }, []);

  if (isLoading) {
    return <Skeleton className="h-10 w-full" />;
  }

  const getInitials = (member: TeamMember) => {
    if (member.firstName && member.lastName) {
      return `${member.firstName[0]}${member.lastName[0]}`.toUpperCase();
    }
    return member.email[0].toUpperCase();
  };

  const getDisplayName = (member: TeamMember) => {
    if (member.firstName && member.lastName) {
      return `${member.firstName} ${member.lastName}`;
    }
    return member.email;
  };

  return (
    <Select
      value={value || "unassigned"}
      onValueChange={(val) => onChange(val === "unassigned" ? null : val)}
      disabled={disabled}
    >
      <SelectTrigger>
        <SelectValue placeholder={placeholder}>
          {value ? (
            (() => {
              const member = teamMembers.find((m) => m.id === value);
              if (member) {
                return (
                  <div className="flex items-center gap-2">
                    <Avatar className="h-5 w-5">
                      <AvatarImage src={member.imageUrl || undefined} />
                      <AvatarFallback className="text-[10px]">
                        {getInitials(member)}
                      </AvatarFallback>
                    </Avatar>
                    <span>{getDisplayName(member)}</span>
                  </div>
                );
              }
              return placeholder;
            })()
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="unassigned">
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
  const [member, setMember] = useState<TeamMember | null>(null);
  const [isLoading, setIsLoading] = useState(!!assigneeId);

  useEffect(() => {
    if (!assigneeId) {
      setIsLoading(false);
      return;
    }

    const fetchMember = async () => {
      try {
        const response = await fetch("/api/team");
        if (response.ok) {
          const data = await response.json();
          const found = data.members?.find((m: TeamMember) => m.id === assigneeId);
          setMember(found || null);
        }
      } catch (error) {
        console.error("Failed to fetch team member:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMember();
  }, [assigneeId]);

  if (isLoading) {
    return <Skeleton className="h-6 w-24" />;
  }

  if (!assigneeId || !member) {
    if (!showUnassigned) return null;
    return (
      <div className={`flex items-center gap-2 text-muted-foreground ${className}`}>
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
    <div className={`flex items-center gap-2 ${className}`}>
      <Avatar className="h-6 w-6">
        <AvatarImage src={member.imageUrl || undefined} />
        <AvatarFallback className="text-[10px]">{getInitials()}</AvatarFallback>
      </Avatar>
      <span className="text-sm">{getDisplayName()}</span>
    </div>
  );
}
