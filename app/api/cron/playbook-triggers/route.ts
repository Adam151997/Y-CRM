import { NextRequest, NextResponse } from "next/server";
import { runAllOrganizationTriggerChecks } from "@/lib/playbook-triggers";

/**
 * GET /api/cron/playbook-triggers
 * 
 * Cron endpoint to check and execute time-based playbook triggers.
 * Currently handles:
 * - RENEWAL_APPROACHING: Starts playbooks for renewals approaching within configured days
 * 
 * This endpoint should be called by Vercel Cron or similar scheduler.
 * Recommended schedule: Daily at 8:00 AM UTC
 * 
 * Add to vercel.json:
 * {
 *   "crons": [
 *     {
 *       "path": "/api/cron/playbook-triggers",
 *       "schedule": "0 8 * * *"
 *     }
 *   ]
 * }
 * 
 * Security: In production, add CRON_SECRET verification
 */
export async function GET(request: NextRequest) {
  try {
    // Optional: Verify cron secret for security
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    console.log("[Cron] Starting playbook trigger checks...");
    
    const result = await runAllOrganizationTriggerChecks();
    
    console.log(`[Cron] Completed. Processed ${result.orgsProcessed} orgs, triggered ${result.totalTriggered} playbooks`);

    return NextResponse.json({
      success: true,
      message: `Processed ${result.orgsProcessed} organizations`,
      orgsProcessed: result.orgsProcessed,
      totalTriggered: result.totalTriggered,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[Cron] Failed to run playbook trigger checks:", error);
    return NextResponse.json(
      { error: "Failed to run playbook trigger checks" },
      { status: 500 }
    );
  }
}

// Also support POST for manual triggering
export async function POST(request: NextRequest) {
  return GET(request);
}
