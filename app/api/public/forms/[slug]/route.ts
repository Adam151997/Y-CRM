import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { incrementFormViews } from "@/lib/marketing/form-submission";

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// GET /api/public/forms/[slug] - Fetch form for public display
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    // Fetch form by slug
    const form = await prisma.form.findFirst({
      where: { 
        slug,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        description: true,
        fields: true,
        settings: true,
        orgId: true,
      },
    });

    if (!form) {
      return NextResponse.json(
        { error: "Form not found" },
        { status: 404 }
      );
    }

    // Increment view count (fire and forget)
    incrementFormViews(form.id).catch(console.error);

    // Return public form data (exclude orgId)
    return NextResponse.json({
      form: {
        id: form.id,
        name: form.name,
        description: form.description,
        fields: form.fields,
        settings: form.settings,
      },
    });
  } catch (error) {
    console.error("Error fetching public form:", error);
    return NextResponse.json(
      { error: "Failed to fetch form" },
      { status: 500 }
    );
  }
}
