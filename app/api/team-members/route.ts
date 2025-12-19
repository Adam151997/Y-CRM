import { NextResponse } from "next/server";
import { getApiAuthContext } from "@/lib/auth";
import { clerkClient } from "@clerk/nextjs/server";

// Force dynamic rendering
export const dynamic = "force-dynamic";

// GET /api/team-members - Get all team members in the organization
export async function GET() {
  try {
    const auth = await getApiAuthContext();
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const client = await clerkClient();
    const memberships = await client.organizations.getOrganizationMembershipList({
      organizationId: auth.orgId,
      limit: 100,
    });

    const members = memberships.data.map((m) => ({
      id: m.publicUserData?.userId || "",
      name: `${m.publicUserData?.firstName || ""} ${m.publicUserData?.lastName || ""}`.trim() ||
        m.publicUserData?.identifier ||
        "Unknown",
      email: m.publicUserData?.identifier || null,
      imageUrl: m.publicUserData?.imageUrl || null,
      role: m.role,
    })).filter((m) => m.id);

    return NextResponse.json({ members });
  } catch (error) {
    console.error("Failed to fetch team members:", error);
    return NextResponse.json(
      { error: "Failed to fetch team members" },
      { status: 500 }
    );
  }
}
