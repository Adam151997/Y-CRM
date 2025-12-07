import { currentUser } from "@clerk/nextjs/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";

export default async function ProfileSettingsPage() {
  const user = await currentUser();

  if (!user) {
    return <div>Loading...</div>;
  }

  const initials = `${user.firstName?.[0] || ""}${user.lastName?.[0] || ""}`.toUpperCase();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Profile Information</CardTitle>
          <CardDescription>
            Your personal information is managed through Clerk
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Avatar and Name */}
          <div className="flex items-center gap-4">
            <Avatar className="h-20 w-20">
              <AvatarImage src={user.imageUrl} alt={user.fullName || ""} />
              <AvatarFallback className="text-lg">{initials}</AvatarFallback>
            </Avatar>
            <div>
              <h3 className="text-xl font-semibold">
                {user.firstName} {user.lastName}
              </h3>
              <p className="text-muted-foreground">
                {user.primaryEmailAddress?.emailAddress}
              </p>
            </div>
          </div>

          {/* Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">User ID</p>
              <p className="font-mono text-sm">{user.id}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Email Verified</p>
              <Badge variant={user.primaryEmailAddress?.verification?.status === "verified" ? "default" : "secondary"}>
                {user.primaryEmailAddress?.verification?.status || "Unknown"}
              </Badge>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Created</p>
              <p className="text-sm">
                {new Date(user.createdAt).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Last Sign In</p>
              <p className="text-sm">
                {user.lastSignInAt
                  ? new Date(user.lastSignInAt).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })
                  : "Never"}
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="pt-4 border-t">
            <Button variant="outline" asChild>
              <a
                href="https://accounts.clerk.dev/user"
                target="_blank"
                rel="noopener noreferrer"
              >
                Manage Profile in Clerk
                <ExternalLink className="h-4 w-4 ml-2" />
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Preferences */}
      <Card>
        <CardHeader>
          <CardTitle>Preferences</CardTitle>
          <CardDescription>
            Customize your experience
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Theme preferences are managed via the theme toggle in the header.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
