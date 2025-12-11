"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useOrganizationList, useOrganization, CreateOrganization } from "@clerk/nextjs";
import { Loader2, Building2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function SelectOrgPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get("redirect") || "/dashboard";
  
  const { isLoaded: orgLoaded, setActive, userMemberships } = useOrganizationList({
    userMemberships: {
      infinite: true,
    },
  });
  const { organization: activeOrg } = useOrganization();
  
  const [isActivating, setIsActivating] = useState(false);
  const [showCreateOrg, setShowCreateOrg] = useState(false);

  useEffect(() => {
    // If already has active org, redirect immediately
    if (activeOrg) {
      router.push(redirectUrl);
      return;
    }

    // If org list loaded and user has memberships, auto-select first one
    if (orgLoaded && userMemberships.data && userMemberships.data.length > 0 && !isActivating) {
      const firstOrg = userMemberships.data[0].organization;
      setIsActivating(true);
      
      setActive({ organization: firstOrg.id })
        .then(() => {
          // Small delay to ensure Clerk updates the session
          setTimeout(() => {
            router.push(redirectUrl);
          }, 500);
        })
        .catch((error) => {
          console.error("Error activating organization:", error);
          setIsActivating(false);
        });
    }

    // If no memberships, show create org UI
    if (orgLoaded && userMemberships.data && userMemberships.data.length === 0) {
      setShowCreateOrg(true);
    }
  }, [orgLoaded, userMemberships.data, activeOrg, setActive, router, redirectUrl, isActivating]);

  // Show create organization if user has none
  if (showCreateOrg) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <Building2 className="h-12 w-12 mx-auto mb-4 text-primary" />
            <CardTitle>Create Your Organization</CardTitle>
            <CardDescription>
              Set up your organization to start using Y CRM
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CreateOrganization 
              afterCreateOrganizationUrl={redirectUrl}
              appearance={{
                elements: {
                  rootBox: "w-full",
                  card: "shadow-none p-0",
                }
              }}
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  // Loading / activating state
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
        <div>
          <p className="font-medium">Setting up your workspace...</p>
          <p className="text-sm text-muted-foreground">Please wait a moment</p>
        </div>
      </div>
    </div>
  );
}
