import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";
import { getFieldsForEntity, TargetEntity } from "@/lib/marketing/segment-calculator";

// GET /api/marketing/segments/fields?targetEntity=CONTACT|LEAD
export async function GET(request: NextRequest) {
  try {
    // Verify user is authenticated
    await getAuthContext();
    
    const { searchParams } = new URL(request.url);
    const targetEntity = (searchParams.get("targetEntity") || "CONTACT") as TargetEntity;

    // Validate target entity
    if (!["CONTACT", "LEAD"].includes(targetEntity)) {
      return NextResponse.json(
        { error: "Invalid targetEntity. Must be CONTACT or LEAD" },
        { status: 400 }
      );
    }

    const fields = getFieldsForEntity(targetEntity);

    return NextResponse.json({ fields, targetEntity });
  } catch (error) {
    console.error("Error fetching segment fields:", error);
    return NextResponse.json(
      { error: "Failed to fetch segment fields" },
      { status: 500 }
    );
  }
}
