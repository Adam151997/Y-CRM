import { getAuthContext } from "@/lib/auth";
import prisma from "@/lib/db";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { NewRenewalForm } from "./_components/new-renewal-form";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { clerkClient } from "@clerk/nextjs/server";

export default async function NewRenewalPage() {
  const { orgId } = await getAuthContext();

  // Fetch accounts for the form
  const accounts = await prisma.account.findMany({
    where: { orgId },
    orderBy: { name: "asc" },
    select: { 
      id: true, 
      name: true,
      health: {
        select: { score: true }
      }
    },
  });

  // Fetch team members for owner assignment
  let teamMembers: { id: string; name: string }[] = [];
  try {
    const client = await clerkClient();
    const memberships = await client.organizations.getOrganizationMembershipList({
      organizationId: orgId,
      limit: 100,
    });
    
    teamMembers = memberships.data.map((m) => ({
      id: m.publicUserData?.userId || "",
      name: `${m.publicUserData?.firstName || ""} ${m.publicUserData?.lastName || ""}`.trim() || 
            m.publicUserData?.identifier || "Unknown",
    })).filter(m => m.id);
  } catch (error) {
    console.error("Failed to fetch team members:", error);
  }

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Button variant="ghost" asChild>
        <Link href="/cs/renewals">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Renewals
        </Link>
      </Button>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Create New Renewal</CardTitle>
          <CardDescription>
            Track an upcoming contract renewal for a customer account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <NewRenewalForm accounts={accounts} teamMembers={teamMembers} />
        </CardContent>
      </Card>
    </div>
  );
}
