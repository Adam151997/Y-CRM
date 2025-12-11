"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Users, UserPlus, Mail, Loader2, Trash2, Clock } from "lucide-react";

interface Role {
  id: string;
  name: string;
  isSystem: boolean;
}

interface TeamMember {
  id: string;
  clerkUserId: string;
  email: string;
  firstName: string;
  lastName: string;
  imageUrl: string;
  role: Role | null;
  orgRole: string;
  createdAt: number;
}

interface PendingInvite {
  id: string;
  email: string;
  status: string;
  role: string;
  createdAt: number;
}

export default function TeamManagementPage() {
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string>("");
  
  // Invite modal state
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRoleId, setInviteRoleId] = useState("");
  const [inviting, setInviting] = useState(false);

  // Remove confirmation
  const [removeUser, setRemoveUser] = useState<TeamMember | null>(null);
  const [removing, setRemoving] = useState(false);

  // Fetch team and roles
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [teamRes, rolesRes] = await Promise.all([
          fetch("/api/team"),
          fetch("/api/roles"),
        ]);

        if (teamRes.ok) {
          const teamData = await teamRes.json();
          setMembers(teamData.members || []);
          setPendingInvites(teamData.pendingInvites || []);
          setCurrentUserId(teamData.currentUserId || "");
        }

        if (rolesRes.ok) {
          const rolesData = await rolesRes.json();
          setRoles(rolesData.roles || []);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        toast.error("Failed to load team data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Handle invite
  const handleInvite = async () => {
    if (!inviteEmail) return;

    setInviting(true);
    try {
      const response = await fetch("/api/team/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: inviteEmail,
          roleId: inviteRoleId || undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to send invite");
      }

      toast.success(`Invitation sent to ${inviteEmail}`);
      setInviteOpen(false);
      setInviteEmail("");
      setInviteRoleId("");

      // Refresh team list
      const teamRes = await fetch("/api/team");
      if (teamRes.ok) {
        const teamData = await teamRes.json();
        setMembers(teamData.members || []);
        setPendingInvites(teamData.pendingInvites || []);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to send invite");
    } finally {
      setInviting(false);
    }
  };

  // Handle role change
  const handleRoleChange = async (userId: string, roleId: string) => {
    try {
      const response = await fetch(`/api/team/${userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roleId }),
      });

      if (!response.ok) {
        throw new Error("Failed to update role");
      }

      // Update local state
      setMembers((prev) =>
        prev.map((m) =>
          m.clerkUserId === userId
            ? { ...m, role: roles.find((r) => r.id === roleId) || null }
            : m
        )
      );

      toast.success("Role updated");
    } catch (error) {
      toast.error("Failed to update role");
    }
  };

  // Handle remove user
  const handleRemove = async () => {
    if (!removeUser) return;

    setRemoving(true);
    try {
      const response = await fetch(`/api/team/${removeUser.clerkUserId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to remove user");
      }

      setMembers((prev) => prev.filter((m) => m.clerkUserId !== removeUser.clerkUserId));
      toast.success(`${removeUser.firstName || removeUser.email} has been removed`);
      setRemoveUser(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to remove user");
    } finally {
      setRemoving(false);
    }
  };

  const getInitials = (firstName: string, lastName: string, email: string) => {
    if (firstName && lastName) {
      return `${firstName[0]}${lastName[0]}`.toUpperCase();
    }
    return email[0]?.toUpperCase() || "?";
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-72" />
          </CardHeader>
          <CardContent className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Team Management
            </CardTitle>
            <CardDescription>
              Manage your team members and their roles
            </CardDescription>
          </div>
          <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="h-4 w-4 mr-2" />
                Invite User
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Invite Team Member</DialogTitle>
                <DialogDescription>
                  Send an invitation to join your organization
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="colleague@company.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <Select value={inviteRoleId} onValueChange={setInviteRoleId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a role" />
                    </SelectTrigger>
                    <SelectContent>
                      {roles.map((role) => (
                        <SelectItem key={role.id} value={role.id}>
                          {role.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground">
                    If no role is selected, the default role will be assigned.
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setInviteOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleInvite} disabled={!inviteEmail || inviting}>
                  {inviting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Mail className="h-4 w-4 mr-2" />
                      Send Invitation
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Team Members */}
          {members.map((member) => (
            <div
              key={member.clerkUserId}
              className="flex items-center justify-between p-4 rounded-lg border bg-card"
            >
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarImage src={member.imageUrl} />
                  <AvatarFallback>
                    {getInitials(member.firstName, member.lastName, member.email)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">
                    {member.firstName} {member.lastName}
                    {member.clerkUserId === currentUserId && (
                      <Badge variant="outline" className="ml-2">You</Badge>
                    )}
                  </p>
                  <p className="text-sm text-muted-foreground">{member.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {member.clerkUserId === currentUserId ? (
                  <Badge variant="secondary">{member.role?.name || "No Role"}</Badge>
                ) : (
                  <>
                    <Select
                      value={member.role?.id || ""}
                      onValueChange={(value) => handleRoleChange(member.clerkUserId, value)}
                    >
                      <SelectTrigger className="w-36">
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        {roles.map((role) => (
                          <SelectItem key={role.id} value={role.id}>
                            {role.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setRemoveUser(member)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </div>
            </div>
          ))}

          {/* Pending Invites */}
          {pendingInvites.length > 0 && (
            <>
              <div className="pt-4 border-t">
                <h3 className="font-medium text-sm text-muted-foreground mb-3">
                  Pending Invitations
                </h3>
                {pendingInvites.map((invite) => (
                  <div
                    key={invite.id}
                    className="flex items-center justify-between p-4 rounded-lg border border-dashed bg-muted/30"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-medium">{invite.email}</p>
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Invitation pending
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline">Pending</Badge>
                  </div>
                ))}
              </div>
            </>
          )}

          {members.length === 0 && pendingInvites.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No team members yet</p>
              <p className="text-sm">Invite your first team member to get started</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Remove Confirmation Dialog */}
      <AlertDialog open={!!removeUser} onOpenChange={() => setRemoveUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Team Member</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove{" "}
              <strong>{removeUser?.firstName || removeUser?.email}</strong> from your
              organization? They will lose access to all CRM data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemove}
              disabled={removing}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {removing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Removing...
                </>
              ) : (
                "Remove"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
