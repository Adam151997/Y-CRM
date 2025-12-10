import { NextRequest, NextResponse } from "next/server";
import { getApiAuthContext } from "@/lib/auth";
import prisma from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * GET /api/organization/branding
 * Get organization branding settings
 */
export async function GET() {
  try {
    const auth = await getApiAuthContext();
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const org = await prisma.organization.findUnique({
      where: { id: auth.orgId },
      select: {
        id: true,
        name: true,
        settings: true,
      },
    });

    if (!org) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    const settings = (org.settings as Record<string, unknown>) || {};
    
    return NextResponse.json({
      orgId: org.id,
      orgName: org.name,
      brandName: settings.brandName || org.name || "Y CRM",
      brandLogo: settings.brandLogo || null,
    });
  } catch (error) {
    console.error("Error fetching branding:", error);
    return NextResponse.json(
      { error: "Failed to fetch branding" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/organization/branding
 * Update organization branding settings
 */
export async function PUT(request: NextRequest) {
  try {
    const auth = await getApiAuthContext();
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { brandName, brandLogo } = body;

    // Get current settings
    const org = await prisma.organization.findUnique({
      where: { id: auth.orgId },
      select: { settings: true },
    });

    const currentSettings = (org?.settings as Record<string, unknown>) || {};

    // Update settings with new branding
    const updatedSettings = {
      ...currentSettings,
      brandName: brandName || undefined,
      brandLogo: brandLogo || undefined,
    };

    // Save to database
    await prisma.organization.update({
      where: { id: auth.orgId },
      data: { settings: updatedSettings },
    });

    return NextResponse.json({
      success: true,
      brandName: brandName || "Y CRM",
      brandLogo: brandLogo || null,
    });
  } catch (error) {
    console.error("Error updating branding:", error);
    return NextResponse.json(
      { error: "Failed to update branding" },
      { status: 500 }
    );
  }
}
