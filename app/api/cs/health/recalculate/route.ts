import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";
import { 
  calculateAccountHealth,
  saveAccountHealth,
} from "@/lib/health-calculator";
import { createAuditLog } from "@/lib/audit";
import prisma from "@/lib/db";
import { triggerHealthDropPlaybooks } from "@/lib/playbook-triggers";

/**
 * POST /api/cs/health/recalculate
 * 
 * Recalculate health scores
 * - With accountId: Recalculate single account
 * - With all=true: Recalculate all accounts
 */
export async function POST(request: NextRequest) {
  try {
    const { orgId, userId } = await getAuthContext();
    
    let body: { accountId?: string; all?: boolean } = {};
    try {
      body = await request.json();
    } catch {
      // Empty body is OK for recalculate all
    }

    const { accountId, all } = body;

    // Recalculate all accounts
    if (all) {
      const accounts = await prisma.account.findMany({
        where: { orgId },
        select: { id: true },
      });

      let processed = 0;
      let errors = 0;

      for (const account of accounts) {
        try {
          // Get existing health for comparison
          const existingHealth = await prisma.accountHealth.findUnique({
            where: { accountId: account.id },
            select: { score: true },
          });

          // Calculate new health
          const health = await calculateAccountHealth(orgId, account.id);
          await saveAccountHealth(orgId, account.id, health);

          // Check for health drop trigger
          if (existingHealth) {
            triggerHealthDropPlaybooks(
              orgId, 
              account.id, 
              health.score, 
              existingHealth.score
            ).catch((error) => {
              console.error("Failed to trigger HEALTH_DROP playbooks:", error);
            });
          }

          processed++;
        } catch (error) {
          console.error(`Failed to calculate health for account ${account.id}:`, error);
          errors++;
        }
      }

      // Audit log
      await createAuditLog({
        orgId,
        action: "UPDATE",
        module: "ACCOUNT_HEALTH",
        actorType: "USER",
        actorId: userId,
        metadata: {
          action: "recalculate_all",
          processed,
          errors,
        },
      });

      return NextResponse.json({
        success: true,
        message: `Recalculated health scores for ${processed} accounts`,
        processed,
        errors,
      });
    }

    // Recalculate single account
    if (accountId) {
      // Get existing health for comparison
      const existingHealth = await prisma.accountHealth.findUnique({
        where: { accountId },
        select: { score: true },
      });

      // Calculate new health
      const health = await calculateAccountHealth(orgId, accountId);
      await saveAccountHealth(orgId, accountId, health);

      // Check for health drop trigger
      if (existingHealth) {
        triggerHealthDropPlaybooks(
          orgId, 
          accountId, 
          health.score, 
          existingHealth.score
        ).catch((error) => {
          console.error("Failed to trigger HEALTH_DROP playbooks:", error);
        });
      }

      // Audit log
      await createAuditLog({
        orgId,
        action: "UPDATE",
        module: "ACCOUNT_HEALTH",
        recordId: accountId,
        actorType: "USER",
        actorId: userId,
        newState: health as unknown as Record<string, unknown>,
        metadata: { action: "recalculate_single" },
      });

      return NextResponse.json({
        success: true,
        health,
      });
    }

    return NextResponse.json(
      { error: "Provide accountId or set all=true" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Failed to recalculate health:", error);
    return NextResponse.json(
      { error: "Failed to recalculate health scores" },
      { status: 500 }
    );
  }
}
