import { currentUser } from "@clerk/nextjs/server";
import { getTranslations, getLocale } from "next-intl/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";

export default async function ProfileSettingsPage() {
  const user = await currentUser();
  const t = await getTranslations("settings");
  const locale = await getLocale();

  if (!user) {
    return <div>{t("loading") || "Loading..."}</div>;
  }

  const initials = `${user.firstName?.[0] || ""}${user.lastName?.[0] || ""}`.toUpperCase();

  // Format dates based on locale
  const dateFormatOptions: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "long",
    day: "numeric",
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t("profile.information")}</CardTitle>
          <CardDescription>
            {t("profile.managedByClerk")}
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
              <p className="text-sm text-muted-foreground">{t("profile.userId")}</p>
              <p className="font-mono text-sm">{user.id}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">{t("profile.emailVerified")}</p>
              <Badge variant={user.primaryEmailAddress?.verification?.status === "verified" ? "default" : "secondary"}>
                {user.primaryEmailAddress?.verification?.status || "Unknown"}
              </Badge>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">{t("profile.created")}</p>
              <p className="text-sm">
                {new Date(user.createdAt).toLocaleDateString(locale, dateFormatOptions)}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">{t("profile.lastSignIn")}</p>
              <p className="text-sm">
                {user.lastSignInAt
                  ? new Date(user.lastSignInAt).toLocaleDateString(locale, dateFormatOptions)
                  : t("profile.never")}
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
                {t("profile.manageInClerk")}
                <ExternalLink className="h-4 w-4 ms-2" />
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Preferences */}
      <Card>
        <CardHeader>
          <CardTitle>{t("preferences.title")}</CardTitle>
          <CardDescription>
            {t("preferences.description")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {t("preferences.themeNote")}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
