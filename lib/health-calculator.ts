import prisma from "@/lib/db";
import { differenceInDays } from "date-fns";

/**
 * Health Score Calculation Engine
 * 
 * Calculates health scores based on real CRM data:
 * - Engagement: Activity frequency, notes
 * - Support: Ticket volume, resolution, satisfaction
 * - Relationship: Contact frequency, meetings
 * - Financial: Renewals, invoices, payment status
 * - Adoption: Default (requires external integration)
 */

interface HealthComponentScores {
  engagementScore: number;
  supportScore: number;
  relationshipScore: number;
  financialScore: number;
  adoptionScore: number;
}

interface HealthCalculationResult extends HealthComponentScores {
  score: number;
  riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  isAtRisk: boolean;
  riskReasons: string[];
  openTicketCount: number;
  lastLoginAt: Date | null;
  lastContactAt: Date | null;
  lastMeetingAt: Date | null;
}

// Weights for overall score calculation
const SCORE_WEIGHTS = {
  engagement: 0.25,
  support: 0.20,
  relationship: 0.20,
  financial: 0.20,
  adoption: 0.15,
};

/**
 * Calculate engagement score based on activities and notes
 */
async function calculateEngagementScore(
  orgId: string,
  accountId: string
): Promise<{ score: number; lastContactAt: Date | null; lastMeetingAt: Date | null }> {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

  // Get recent activities
  const activities = await prisma.activity.findMany({
    where: {
      orgId,
      accountId,
      performedAt: { gte: ninetyDaysAgo },
    },
    orderBy: { performedAt: "desc" },
  });

  // Get recent notes
  const notesCount = await prisma.note.count({
    where: {
      orgId,
      accountId,
      createdAt: { gte: ninetyDaysAgo },
    },
  });

  // Find last contact and meeting
  const lastContact = activities.find(a => 
    ["CALL", "EMAIL", "MEETING", "NOTE"].includes(a.type)
  );
  const lastMeeting = activities.find(a => a.type === "MEETING");

  // Calculate score components
  let score = 50; // Base score

  // Recent activity bonus (last 30 days)
  const recentActivities = activities.filter(a => 
    new Date(a.performedAt) >= thirtyDaysAgo
  ).length;
  
  if (recentActivities >= 5) score += 25;
  else if (recentActivities >= 3) score += 15;
  else if (recentActivities >= 1) score += 5;
  else score -= 20; // No recent activity penalty

  // Notes bonus
  if (notesCount >= 5) score += 15;
  else if (notesCount >= 2) score += 10;
  else if (notesCount >= 1) score += 5;

  // Recency of last contact
  if (lastContact) {
    const daysSinceContact = differenceInDays(now, new Date(lastContact.performedAt));
    if (daysSinceContact <= 7) score += 10;
    else if (daysSinceContact <= 14) score += 5;
    else if (daysSinceContact > 30) score -= 10;
    else if (daysSinceContact > 60) score -= 20;
  } else {
    score -= 15; // No contact ever
  }

  return {
    score: Math.max(0, Math.min(100, score)),
    lastContactAt: lastContact ? new Date(lastContact.performedAt) : null,
    lastMeetingAt: lastMeeting ? new Date(lastMeeting.performedAt) : null,
  };
}

/**
 * Calculate support score based on tickets
 */
async function calculateSupportScore(
  orgId: string,
  accountId: string
): Promise<{ score: number; openTicketCount: number }> {
  const now = new Date();
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

  // Get open tickets
  const openTickets = await prisma.ticket.findMany({
    where: {
      orgId,
      accountId,
      status: { in: ["NEW", "OPEN", "PENDING"] },
    },
  });

  // Get resolved tickets in last 90 days for satisfaction
  const resolvedTickets = await prisma.ticket.findMany({
    where: {
      orgId,
      accountId,
      status: { in: ["RESOLVED", "CLOSED"] },
      resolvedAt: { gte: ninetyDaysAgo },
    },
    select: {
      satisfactionScore: true,
      createdAt: true,
      resolvedAt: true,
    },
  });

  let score = 70; // Base score (no tickets = good)

  // Open ticket penalty
  const openCount = openTickets.length;
  if (openCount === 0) score += 20;
  else if (openCount === 1) score -= 5;
  else if (openCount === 2) score -= 15;
  else if (openCount >= 3) score -= 30;

  // Urgent ticket penalty
  const urgentTickets = openTickets.filter(t => t.priority === "URGENT").length;
  score -= urgentTickets * 10;

  // High priority penalty
  const highTickets = openTickets.filter(t => t.priority === "HIGH").length;
  score -= highTickets * 5;

  // CSAT bonus/penalty
  const ticketsWithCSAT = resolvedTickets.filter(t => t.satisfactionScore !== null);
  if (ticketsWithCSAT.length > 0) {
    const avgCSAT = ticketsWithCSAT.reduce((sum, t) => sum + (t.satisfactionScore || 0), 0) / ticketsWithCSAT.length;
    if (avgCSAT >= 4.5) score += 15;
    else if (avgCSAT >= 4) score += 10;
    else if (avgCSAT >= 3) score += 0;
    else if (avgCSAT >= 2) score -= 10;
    else score -= 20;
  }

  return {
    score: Math.max(0, Math.min(100, score)),
    openTicketCount: openCount,
  };
}

/**
 * Calculate relationship score based on contacts
 */
async function calculateRelationshipScore(
  orgId: string,
  accountId: string
): Promise<number> {
  // Get contacts for account
  const contacts = await prisma.contact.findMany({
    where: { orgId, accountId },
    select: { isPrimary: true },
  });

  let score = 50; // Base score

  // Contact count bonus
  if (contacts.length >= 5) score += 20;
  else if (contacts.length >= 3) score += 15;
  else if (contacts.length >= 2) score += 10;
  else if (contacts.length === 1) score += 5;
  else score -= 20; // No contacts penalty

  // Primary contact bonus
  const hasPrimary = contacts.some(c => c.isPrimary);
  if (hasPrimary) score += 10;

  // Check for tasks assigned to account
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  
  const recentTasks = await prisma.task.count({
    where: {
      orgId,
      accountId,
      createdAt: { gte: thirtyDaysAgo },
    },
  });

  if (recentTasks >= 3) score += 10;
  else if (recentTasks >= 1) score += 5;

  return Math.max(0, Math.min(100, score));
}

/**
 * Calculate financial score based on renewals and invoices
 */
async function calculateFinancialScore(
  orgId: string,
  accountId: string
): Promise<number> {
  const now = new Date();
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

  // Get renewals
  const renewals = await prisma.renewal.findMany({
    where: { orgId, accountId },
    orderBy: { endDate: "desc" },
  });

  // Get invoices
  const invoices = await prisma.invoice.findMany({
    where: { orgId, accountId },
    orderBy: { dueDate: "desc" },
  });

  let score = 60; // Base score

  // Renewal health
  const activeRenewal = renewals.find(r => 
    ["UPCOMING", "IN_PROGRESS"].includes(r.status)
  );
  
  if (activeRenewal) {
    // High probability bonus
    if (activeRenewal.probability >= 80) score += 20;
    else if (activeRenewal.probability >= 60) score += 10;
    else if (activeRenewal.probability >= 40) score += 0;
    else if (activeRenewal.probability >= 20) score -= 10;
    else score -= 20;
  }

  // Churn history penalty
  const churnedRenewals = renewals.filter(r => r.status === "CHURNED").length;
  score -= churnedRenewals * 15;

  // Invoice payment health
  const overdueInvoices = invoices.filter(i => 
    i.status === "OVERDUE" || 
    (["SENT", "VIEWED"].includes(i.status) && new Date(i.dueDate) < now)
  ).length;

  if (overdueInvoices === 0) score += 10;
  else if (overdueInvoices === 1) score -= 10;
  else score -= 20;

  // Recent paid invoices bonus
  const recentPaid = invoices.filter(i => 
    i.status === "PAID" && i.paidAt && new Date(i.paidAt) >= ninetyDaysAgo
  ).length;
  
  if (recentPaid >= 2) score += 10;
  else if (recentPaid >= 1) score += 5;

  return Math.max(0, Math.min(100, score));
}

/**
 * Calculate adoption score
 * Note: This requires external product usage data integration
 * For now, returns a baseline score
 */
function calculateAdoptionScore(): number {
  // Default adoption score - would need product analytics integration
  return 50;
}

/**
 * Calculate overall health score from components
 */
function calculateOverallScore(components: HealthComponentScores): number {
  return Math.round(
    components.engagementScore * SCORE_WEIGHTS.engagement +
    components.supportScore * SCORE_WEIGHTS.support +
    components.relationshipScore * SCORE_WEIGHTS.relationship +
    components.financialScore * SCORE_WEIGHTS.financial +
    components.adoptionScore * SCORE_WEIGHTS.adoption
  );
}

/**
 * Determine risk level from score
 */
function getRiskLevel(score: number): "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" {
  if (score >= 70) return "LOW";
  if (score >= 50) return "MEDIUM";
  if (score >= 30) return "HIGH";
  return "CRITICAL";
}

/**
 * Generate risk reasons based on health data
 */
function generateRiskReasons(
  components: HealthComponentScores,
  openTicketCount: number,
  lastContactAt: Date | null
): string[] {
  const reasons: string[] = [];
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

  // Component-based risks
  if (components.engagementScore < 40) {
    reasons.push("Low engagement activity");
  }
  if (components.supportScore < 40) {
    reasons.push("Support health concerns");
  }
  if (components.relationshipScore < 40) {
    reasons.push("Relationship needs attention");
  }
  if (components.financialScore < 40) {
    reasons.push("Financial health at risk");
  }

  // Specific risks
  if (openTicketCount >= 3) {
    reasons.push(`${openTicketCount} open support tickets`);
  }

  if (!lastContactAt || lastContactAt < sixtyDaysAgo) {
    reasons.push("No contact in 60+ days");
  } else if (lastContactAt < thirtyDaysAgo) {
    reasons.push("No contact in 30+ days");
  }

  return reasons;
}

/**
 * Calculate health score for a single account
 */
export async function calculateAccountHealth(
  orgId: string,
  accountId: string
): Promise<HealthCalculationResult> {
  // Calculate all component scores
  const engagement = await calculateEngagementScore(orgId, accountId);
  const support = await calculateSupportScore(orgId, accountId);
  const relationshipScore = await calculateRelationshipScore(orgId, accountId);
  const financialScore = await calculateFinancialScore(orgId, accountId);
  const adoptionScore = calculateAdoptionScore();

  const components: HealthComponentScores = {
    engagementScore: engagement.score,
    supportScore: support.score,
    relationshipScore,
    financialScore,
    adoptionScore,
  };

  const score = calculateOverallScore(components);
  const riskLevel = getRiskLevel(score);
  const isAtRisk = riskLevel === "HIGH" || riskLevel === "CRITICAL";
  const riskReasons = isAtRisk 
    ? generateRiskReasons(components, support.openTicketCount, engagement.lastContactAt)
    : [];

  return {
    ...components,
    score,
    riskLevel,
    isAtRisk,
    riskReasons,
    openTicketCount: support.openTicketCount,
    lastLoginAt: null, // Would need external integration
    lastContactAt: engagement.lastContactAt,
    lastMeetingAt: engagement.lastMeetingAt,
  };
}

/**
 * Save calculated health score to database
 */
export async function saveAccountHealth(
  orgId: string,
  accountId: string,
  health: HealthCalculationResult
): Promise<void> {
  // Get existing health record for previousScore
  const existing = await prisma.accountHealth.findUnique({
    where: { accountId },
    select: { score: true },
  });

  await prisma.accountHealth.upsert({
    where: { accountId },
    create: {
      orgId,
      accountId,
      score: health.score,
      previousScore: null,
      riskLevel: health.riskLevel,
      isAtRisk: health.isAtRisk,
      riskReasons: health.riskReasons,
      engagementScore: health.engagementScore,
      supportScore: health.supportScore,
      relationshipScore: health.relationshipScore,
      financialScore: health.financialScore,
      adoptionScore: health.adoptionScore,
      openTicketCount: health.openTicketCount,
      lastLoginAt: health.lastLoginAt,
      lastContactAt: health.lastContactAt,
      lastMeetingAt: health.lastMeetingAt,
      calculatedAt: new Date(),
    },
    update: {
      previousScore: existing?.score ?? null,
      score: health.score,
      riskLevel: health.riskLevel,
      isAtRisk: health.isAtRisk,
      riskReasons: health.riskReasons,
      engagementScore: health.engagementScore,
      supportScore: health.supportScore,
      relationshipScore: health.relationshipScore,
      financialScore: health.financialScore,
      adoptionScore: health.adoptionScore,
      openTicketCount: health.openTicketCount,
      lastLoginAt: health.lastLoginAt,
      lastContactAt: health.lastContactAt,
      lastMeetingAt: health.lastMeetingAt,
      calculatedAt: new Date(),
    },
  });
}

/**
 * Recalculate health for a single account
 */
export async function recalculateAccountHealth(
  orgId: string,
  accountId: string
): Promise<HealthCalculationResult> {
  const health = await calculateAccountHealth(orgId, accountId);
  await saveAccountHealth(orgId, accountId, health);
  return health;
}

/**
 * Recalculate health for all accounts in an organization
 */
export async function recalculateAllAccountHealth(
  orgId: string
): Promise<{ processed: number; errors: number }> {
  // Get all accounts (customers typically)
  const accounts = await prisma.account.findMany({
    where: { orgId },
    select: { id: true },
  });

  let processed = 0;
  let errors = 0;

  for (const account of accounts) {
    try {
      await recalculateAccountHealth(orgId, account.id);
      processed++;
    } catch (error) {
      console.error(`Failed to calculate health for account ${account.id}:`, error);
      errors++;
    }
  }

  return { processed, errors };
}
