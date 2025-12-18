import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// GET /api/public/forms/[slug] - Fetch form for public display
// NOTE: View tracking is handled by the page component, NOT here
// This API is used for embedding/AJAX scenarios where the page already tracked the view
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
