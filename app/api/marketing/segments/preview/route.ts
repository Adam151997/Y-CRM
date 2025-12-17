import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";
import { previewSegmentMembers, SegmentRule, RuleLogic, TargetEntity } from "@/lib/marketing/segment-calculator";
import { z } from "zod";

const ruleSchema = z.object({
  field: z.string(),
  operator: z.string(),
  value: z.union([z.string(), z.number(), z.boolean()]).optional(),
});

const previewSchema = z.object({
  targetEntity: z.enum(["CONTACT", "LEAD"]),
  rules: z.array(ruleSchema),
  ruleLogic: z.enum(["AND", "OR"]).default("AND"),
  limit: z.number().optional().default(10),
});

// POST /api/marketing/segments/preview - Preview segment members without creating
export async function POST(request: NextRequest) {
  try {
    const { orgId } = await getAuthContext();
    const body = await request.json();

    // Validate request body
    const validationResult = previewSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Invalid request data", details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const { targetEntity, rules, ruleLogic, limit } = validationResult.data;

    // Preview members
    const result = await previewSegmentMembers(
      orgId,
      targetEntity as TargetEntity,
      rules as SegmentRule[],
      ruleLogic as RuleLogic,
      limit
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error previewing segment members:", error);
    return NextResponse.json(
      { error: "Failed to preview segment members" },
      { status: 500 }
    );
  }
}
