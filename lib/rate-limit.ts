import Redis from "ioredis";
import prisma from "./db";

// Initialize Redis client (lazy initialization)
let redis: Redis | null = null;

function getRedis(): Redis | null {
  if (redis) return redis;

  const url = process.env.REDIS_URL;

  if (!url) {
    console.warn("Redis not configured - rate limiting disabled");
    return null;
  }

  try {
    redis = new Redis(url, {
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    });

    redis.on("error", (err) => {
      console.error("Redis connection error:", err);
    });

    return redis;
  } catch (error) {
    console.error("Failed to initialize Redis:", error);
    return null;
  }
}

// Plan limits configuration
interface PlanLimits {
  aiCallsPerMonth: number;
  transcriptionsPerDay: number;
  voiceMinutesPerDay: number;
  embeddingsPerDay: number;
}

const PLAN_LIMITS: Record<string, PlanLimits> = {
  FREE: {
    aiCallsPerMonth: 100,
    transcriptionsPerDay: 20,
    voiceMinutesPerDay: 10,
    embeddingsPerDay: 100,
  },
  PRO: {
    aiCallsPerMonth: 2000,
    transcriptionsPerDay: 200,
    voiceMinutesPerDay: 60,
    embeddingsPerDay: 1000,
  },
  ENTERPRISE: {
    aiCallsPerMonth: 50000,
    transcriptionsPerDay: 5000,
    voiceMinutesPerDay: 500,
    embeddingsPerDay: 10000,
  },
};

export type RateLimitType = "ai" | "transcription" | "voice" | "embedding" | "AI_CALL";

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetInSeconds?: number;
  resetAt?: Date;
  limit: number;
}

async function getOrgPlan(orgId: string): Promise<string> {
  try {
    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      select: { plan: true },
    });
    return org?.plan || "FREE";
  } catch {
    return "FREE";
  }
}

/**
 * Simple helper to check rate limit
 */
export async function checkRateLimit(
  orgId: string,
  type: RateLimitType
): Promise<RateLimitResult> {
  // Normalize type
  const normalizedType = type === "AI_CALL" ? "ai" : type.toLowerCase() as RateLimitType;
  return rateLimit.check(orgId, normalizedType as "ai" | "transcription" | "voice" | "embedding");
}

/**
 * Simple helper to increment usage
 */
export async function incrementUsage(
  orgId: string,
  userId: string,
  type: RateLimitType,
  amount: number = 1
): Promise<void> {
  const normalizedType = type === "AI_CALL" ? "ai" : type.toLowerCase() as RateLimitType;
  await rateLimit.increment(orgId, normalizedType as "ai" | "transcription" | "voice" | "embedding", amount);
}

export const rateLimit = {
  async check(orgId: string, type: "ai" | "transcription" | "voice" | "embedding"): Promise<RateLimitResult> {
    const plan = await getOrgPlan(orgId);
    const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.FREE;
    const now = new Date();
    const redisClient = getRedis();

    switch (type) {
      case "ai": {
        // Monthly limit stored in database
        const org = await prisma.organization.findUnique({
          where: { id: orgId },
          select: { aiCallsThisMonth: true, aiCallsLimit: true },
        });

        const used = org?.aiCallsThisMonth || 0;
        const limit = org?.aiCallsLimit || limits.aiCallsPerMonth;
        const allowed = used < limit;

        // Calculate reset time (start of next month)
        const resetDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);

        return {
          allowed,
          remaining: Math.max(0, limit - used),
          resetInSeconds: Math.floor(
            (resetDate.getTime() - now.getTime()) / 1000
          ),
          resetAt: resetDate,
          limit,
        };
      }

      case "transcription": {
        if (!redisClient) {
          return {
            allowed: true,
            remaining: limits.transcriptionsPerDay,
            resetInSeconds: 86400,
            limit: limits.transcriptionsPerDay,
          };
        }

        const key = `ratelimit:transcription:${orgId}:${now.toISOString().split("T")[0]}`;
        const count = await redisClient.incr(key);

        if (count === 1) {
          await redisClient.expire(key, 86400);
        }

        const limit = limits.transcriptionsPerDay;
        const allowed = count <= limit;

        return {
          allowed,
          remaining: Math.max(0, limit - count),
          resetInSeconds: (await redisClient.ttl(key)) || 86400,
          limit,
        };
      }

      case "voice": {
        if (!redisClient) {
          return {
            allowed: true,
            remaining: limits.voiceMinutesPerDay,
            resetInSeconds: 86400,
            limit: limits.voiceMinutesPerDay,
          };
        }

        const key = `ratelimit:voice:${orgId}:${now.toISOString().split("T")[0]}`;
        const minutes = parseFloat((await redisClient.get(key)) || "0");
        const limit = limits.voiceMinutesPerDay;

        return {
          allowed: minutes < limit,
          remaining: Math.max(0, limit - minutes),
          resetInSeconds: (await redisClient.ttl(key)) || 86400,
          limit,
        };
      }

      case "embedding": {
        if (!redisClient) {
          return {
            allowed: true,
            remaining: limits.embeddingsPerDay,
            resetInSeconds: 86400,
            limit: limits.embeddingsPerDay,
          };
        }

        const key = `ratelimit:embedding:${orgId}:${now.toISOString().split("T")[0]}`;
        const count = parseInt((await redisClient.get(key)) || "0");
        const limit = limits.embeddingsPerDay;

        return {
          allowed: count < limit,
          remaining: Math.max(0, limit - count),
          resetInSeconds: (await redisClient.ttl(key)) || 86400,
          limit,
        };
      }
    }
  },

  async increment(
    orgId: string,
    type: "ai" | "transcription" | "voice" | "embedding",
    amount: number = 1
  ): Promise<void> {
    const redisClient = getRedis();
    const now = new Date();

    switch (type) {
      case "ai":
        await prisma.organization.update({
          where: { id: orgId },
          data: { aiCallsThisMonth: { increment: amount } },
        });
        break;

      case "transcription":
        if (redisClient) {
          const key = `ratelimit:transcription:${orgId}:${now.toISOString().split("T")[0]}`;
          await redisClient.incrby(key, amount);
          await redisClient.expire(key, 86400);
        }
        break;

      case "embedding":
        if (redisClient) {
          const key = `ratelimit:embedding:${orgId}:${now.toISOString().split("T")[0]}`;
          await redisClient.incrby(key, amount);
          await redisClient.expire(key, 86400);
        }
        break;
    }

    // Also record usage
    try {
      await prisma.usageRecord.create({
        data: {
          orgId,
          type: type.toUpperCase(),
          count: amount,
        },
      });
    } catch (error) {
      console.error("Failed to record usage:", error);
    }
  },

  async trackVoiceMinutes(orgId: string, seconds: number): Promise<void> {
    const redisClient = getRedis();

    if (redisClient) {
      const key = `ratelimit:voice:${orgId}:${new Date().toISOString().split("T")[0]}`;
      await redisClient.incrbyfloat(key, seconds / 60);
      await redisClient.expire(key, 86400);
    }

    try {
      await prisma.usageRecord.create({
        data: {
          orgId,
          type: "VOICE_MINUTES",
          count: 1,
          metadata: { seconds },
        },
      });
    } catch (error) {
      console.error("Failed to record voice usage:", error);
    }
  },

  async resetMonthlyCounters(): Promise<void> {
    // Called at the start of each month
    await prisma.organization.updateMany({
      data: { aiCallsThisMonth: 0 },
    });
  },
};

export async function getUsageStats(
  orgId: string,
  startDate?: Date,
  endDate?: Date
) {
  const where: Record<string, unknown> = { orgId };

  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) (where.createdAt as Record<string, Date>).gte = startDate;
    if (endDate) (where.createdAt as Record<string, Date>).lte = endDate;
  }

  const records = await prisma.usageRecord.groupBy({
    by: ["type"],
    where,
    _sum: { count: true },
  });

  return records.reduce(
    (acc, record) => {
      acc[record.type] = record._sum.count || 0;
      return acc;
    },
    {} as Record<string, number>
  );
}
