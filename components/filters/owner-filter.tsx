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
import { User, Users } from "lucide-react";

interface TeamMember {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  imageUrl: string | null;
}

interface OwnerFilterProps {
  value?: string;
  onChange: (value: string | null) => void;
  currentUserId?: string;
  className?: string;
}

export const ALL_VALUE = "_all";
export const MY_RECORDS = "_my";
export const UNASSIGNED = "_unassigned";

export function OwnerFilter({
  value,
  onChange,
  currentUserId,
  className,
}: OwnerFilterProps) {
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
    return <Skeleton className="h-10 w-[150px]" />;
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

  const handleChange = (newValue: string) => {
    if (newValue === ALL_VALUE) {
      onChange(null);
    } else if (newValue === MY_RECORDS && currentUserId) {
      onChange(MY_RECORDS);
    } else if (newValue === UNASSIGNED) {
      onChange(UNASSIGNED);
    } else {
      onChange(newValue);
    }
  };

  return (
    <Select
      value={value || ALL_VALUE}
      onValueChange={handleChange}
    >
      <SelectTrigger className={className || "w-[150px]"}>
        <SelectValue placeholder="Owner" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL_VALUE}>
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span>All Records</span>
          </div>
        </SelectItem>
        {currentUserId && (
          <SelectItem value={MY_RECORDS}>
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-primary" />
              <span>My Records</span>
            </div>
          </SelectItem>
        )}
        <SelectItem value={UNASSIGNED}>
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 rounded-full border border-dashed border-muted-foreground flex items-center justify-center">
              <User className="h-2.5 w-2.5 text-muted-foreground" />
            </div>
            <span className="text-muted-foreground">Unassigned</span>
          </div>
        </SelectItem>
        {teamMembers.length > 0 && (
          <div className="border-t my-1" />
        )}
        {teamMembers.map((member) => (
          <SelectItem key={member.id} value={member.id}>
            <div className="flex items-center gap-2">
              <Avatar className="h-4 w-4">
                <AvatarImage src={member.imageUrl || undefined} />
                <AvatarFallback className="text-[8px]">
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
