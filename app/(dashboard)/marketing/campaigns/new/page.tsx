import { getAuthContext } from "@/lib/auth";
import prisma from "@/lib/db";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { NewCampaignForm } from "./_components/new-campaign-form";

export default async function NewCampaignPage() {
  const { orgId } = await getAuthContext();

  // Get segments for dropdown
  const segments = await prisma.segment.findMany({
    where: { orgId, isActive: true },
    select: { id: true, name: true, memberCount: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Button variant="ghost" asChild>
        <Link href="/marketing/campaigns">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Campaigns
        </Link>
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>Create New Campaign</CardTitle>
          <CardDescription>
            Set up a new marketing campaign to reach your audience
          </CardDescription>
        </CardHeader>
        <CardContent>
          <NewCampaignForm segments={segments} />
        </CardContent>
      </Card>
    </div>
  );
}
