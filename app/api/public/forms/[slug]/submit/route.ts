import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { processFormSubmission, validateSubmission, FormField, SubmissionData } from "@/lib/marketing/form-submission";
import { headers } from "next/headers";

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// Simple in-memory rate limiting (per IP)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX = 10; // 10 submissions per minute per IP

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(ip);

  if (!record || now > record.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return true;
  }

  if (record.count >= RATE_LIMIT_MAX) {
    return false;
  }

  record.count++;
  return true;
}

// POST /api/public/forms/[slug]/submit - Submit form data
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const headersList = await headers();

    // Get client info
    const forwardedFor = headersList.get("x-forwarded-for");
    const ipAddress = forwardedFor?.split(",")[0]?.trim() || "unknown";
    const userAgent = headersList.get("user-agent") || undefined;
    const referrer = headersList.get("referer") || undefined;

    // Rate limiting
    if (!checkRateLimit(ipAddress)) {
      return NextResponse.json(
        { error: "Too many submissions. Please try again later." },
        { status: 429 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { data, honeypot } = body as { data: SubmissionData; honeypot?: string };

    // Honeypot check - if filled, it's likely a bot
    if (honeypot) {
      // Silently accept but don't process
      return NextResponse.json({
        success: true,
        confirmationMessage: "Thank you for your submission!",
      });
    }

    // Fetch form to get orgId and validate
    const form = await prisma.form.findFirst({
      where: { slug, isActive: true },
      select: {
        id: true,
        orgId: true,
        fields: true,
      },
    });

    if (!form) {
      return NextResponse.json(
        { error: "Form not found" },
        { status: 404 }
      );
    }

    // Validate submission
    const fields = form.fields as unknown as FormField[];
    const validation = validateSubmission(fields, data);
    
    if (!validation.valid) {
      return NextResponse.json(
        { error: "Validation failed", errors: validation.errors },
        { status: 400 }
      );
    }

    // Process submission
    const result = await processFormSubmission(
      form.id,
      form.orgId,
      data,
      { ipAddress, userAgent, referrer }
    );

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Submission failed" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      submissionId: result.submissionId,
      redirectUrl: result.redirectUrl,
      confirmationMessage: result.confirmationMessage,
    });
  } catch (error) {
    console.error("Error processing form submission:", error);
    return NextResponse.json(
      { error: "Failed to process submission" },
      { status: 500 }
    );
  }
}
