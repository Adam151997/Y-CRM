/**
 * Segment Member Calculation Engine
 * Evaluates segment rules against Contacts or Leads
 */

import prisma from "@/lib/db";

// Types
export type TargetEntity = "CONTACT" | "LEAD";
export type RuleLogic = "AND" | "OR";

export interface SegmentRule {
  field: string;
  operator: string;
  value?: string | number | boolean;
}

export interface CalculationResult {
  memberCount: number;
  membersAdded: number;
  membersRemoved: number;
  calculatedAt: Date;
}

// Field mappings for each entity type
const CONTACT_FIELD_MAP: Record<string, string> = {
  email: "email",
  firstName: "firstName",
  lastName: "lastName",
  phone: "phone",
  title: "title",
  department: "department",
  company: "account.name", // Nested relation
  industry: "account.industry", // Nested relation
  accountType: "account.type",
  isPrimary: "isPrimary",
  createdAt: "createdAt",
  updatedAt: "updatedAt",
};

const LEAD_FIELD_MAP: Record<string, string> = {
  email: "email",
  firstName: "firstName",
  lastName: "lastName",
  phone: "phone",
  title: "title",
  company: "company",
  source: "source",
  status: "status",
  createdAt: "createdAt",
  updatedAt: "updatedAt",
  convertedAt: "convertedAt",
};

/**
 * Build a Prisma WHERE condition from a single rule
 */
function buildRuleCondition(
  rule: SegmentRule,
  targetEntity: TargetEntity
): Record<string, unknown> | null {
  const fieldMap = targetEntity === "CONTACT" ? CONTACT_FIELD_MAP : LEAD_FIELD_MAP;
  const fieldPath = fieldMap[rule.field];

  if (!fieldPath) {
    console.warn(`Unknown field "${rule.field}" for entity ${targetEntity}`);
    return null;
  }

  // Handle nested fields (e.g., "account.name")
  const isNested = fieldPath.includes(".");
  const [parentField, childField] = isNested ? fieldPath.split(".") : [fieldPath, null];

  const condition = buildOperatorCondition(rule.operator, rule.value);
  if (!condition) return null;

  if (isNested && childField) {
    return {
      [parentField]: {
        [childField]: condition,
      },
    };
  }

  return { [parentField]: condition };
}

/**
 * Build Prisma condition based on operator
 */
function buildOperatorCondition(
  operator: string,
  value?: string | number | boolean
): Record<string, unknown> | string | number | boolean | null {
  switch (operator) {
    case "equals":
      return value ?? null;

    case "not_equals":
      return { not: value ?? null };

    case "contains":
      return { contains: String(value ?? ""), mode: "insensitive" };

    case "not_contains":
      return { not: { contains: String(value ?? ""), mode: "insensitive" } };

    case "starts_with":
      return { startsWith: String(value ?? ""), mode: "insensitive" };

    case "ends_with":
      return { endsWith: String(value ?? ""), mode: "insensitive" };

    case "greater_than":
      return { gt: value ?? 0 };

    case "less_than":
      return { lt: value ?? 0 };

    case "is_empty":
      return { in: [null, ""] };

    case "is_not_empty":
      return { notIn: [null, ""] };

    default:
      console.warn(`Unknown operator: ${operator}`);
      return null;
  }
}

/**
 * Build the complete Prisma WHERE clause from all rules
 */
export function buildPrismaWhereClause(
  rules: SegmentRule[],
  ruleLogic: RuleLogic,
  targetEntity: TargetEntity,
  orgId: string
): Record<string, unknown> {
  // Base condition: must belong to this org
  const baseCondition = { orgId };

  if (rules.length === 0) {
    return baseCondition;
  }

  // Build conditions for each rule
  const conditions = rules
    .map((rule) => buildRuleCondition(rule, targetEntity))
    .filter((c): c is Record<string, unknown> => c !== null);

  if (conditions.length === 0) {
    return baseCondition;
  }

  // Combine with AND or OR logic
  if (ruleLogic === "AND") {
    return {
      ...baseCondition,
      AND: conditions,
    };
  } else {
    return {
      ...baseCondition,
      OR: conditions,
    };
  }
}

/**
 * Calculate segment members and update the database
 */
export async function calculateSegmentMembers(
  segmentId: string,
  orgId: string
): Promise<CalculationResult> {
  // Fetch segment with current members
  const segment = await prisma.segment.findFirst({
    where: { id: segmentId, orgId },
    include: {
      members: {
        select: { id: true, contactId: true, leadId: true },
      },
    },
  });

  if (!segment) {
    throw new Error("Segment not found");
  }

  const targetEntity = segment.targetEntity as TargetEntity;
  const rules = segment.rules as unknown as SegmentRule[];
  const ruleLogic = segment.ruleLogic as RuleLogic;
  const isStatic = segment.type === "STATIC";

  // For static segments, use staticMembers list
  if (isStatic) {
    const staticMemberIds = (segment.staticMembers as unknown as string[]) || [];
    return await updateStaticSegmentMembers(
      segmentId,
      orgId,
      targetEntity,
      staticMemberIds,
      segment.members
    );
  }

  // For dynamic segments, evaluate rules
  const whereClause = buildPrismaWhereClause(rules, ruleLogic, targetEntity, orgId);

  // Query matching entities
  let matchingEntityIds: string[] = [];

  if (targetEntity === "CONTACT") {
    const contacts = await prisma.contact.findMany({
      where: whereClause,
      select: { id: true },
    });
    matchingEntityIds = contacts.map((c) => c.id);
  } else {
    const leads = await prisma.lead.findMany({
      where: whereClause,
      select: { id: true },
    });
    matchingEntityIds = leads.map((l) => l.id);
  }

  // Get current member IDs
  const currentMemberIds = segment.members.map((m) =>
    targetEntity === "CONTACT" ? m.contactId : m.leadId
  ).filter((id): id is string => id !== null);

  // Calculate diff
  const toAdd = matchingEntityIds.filter((id) => !currentMemberIds.includes(id));
  const toRemove = currentMemberIds.filter((id) => !matchingEntityIds.includes(id));

  // Update members in a transaction
  await prisma.$transaction(async (tx) => {
    // Remove members no longer matching
    if (toRemove.length > 0) {
      if (targetEntity === "CONTACT") {
        await tx.segmentMember.deleteMany({
          where: {
            segmentId,
            contactId: { in: toRemove },
          },
        });
      } else {
        await tx.segmentMember.deleteMany({
          where: {
            segmentId,
            leadId: { in: toRemove },
          },
        });
      }
    }

    // Add new matching members
    if (toAdd.length > 0) {
      const newMembers = toAdd.map((entityId) => ({
        segmentId,
        contactId: targetEntity === "CONTACT" ? entityId : null,
        leadId: targetEntity === "LEAD" ? entityId : null,
      }));

      await tx.segmentMember.createMany({
        data: newMembers,
        skipDuplicates: true,
      });
    }

    // Update segment stats
    await tx.segment.update({
      where: { id: segmentId },
      data: {
        memberCount: matchingEntityIds.length,
        lastCalculatedAt: new Date(),
      },
    });
  });

  return {
    memberCount: matchingEntityIds.length,
    membersAdded: toAdd.length,
    membersRemoved: toRemove.length,
    calculatedAt: new Date(),
  };
}

/**
 * Update members for a static segment
 */
async function updateStaticSegmentMembers(
  segmentId: string,
  orgId: string,
  targetEntity: TargetEntity,
  staticMemberIds: string[],
  currentMembers: Array<{ id: string; contactId: string | null; leadId: string | null }>
): Promise<CalculationResult> {
  // Validate that the IDs exist
  let validIds: string[] = [];

  if (targetEntity === "CONTACT") {
    const contacts = await prisma.contact.findMany({
      where: { id: { in: staticMemberIds }, orgId },
      select: { id: true },
    });
    validIds = contacts.map((c) => c.id);
  } else {
    const leads = await prisma.lead.findMany({
      where: { id: { in: staticMemberIds }, orgId },
      select: { id: true },
    });
    validIds = leads.map((l) => l.id);
  }

  // Get current member IDs
  const currentMemberIds = currentMembers.map((m) =>
    targetEntity === "CONTACT" ? m.contactId : m.leadId
  ).filter((id): id is string => id !== null);

  // Calculate diff
  const toAdd = validIds.filter((id) => !currentMemberIds.includes(id));
  const toRemove = currentMemberIds.filter((id) => !validIds.includes(id));

  // Update members in a transaction
  await prisma.$transaction(async (tx) => {
    // Remove members no longer in static list
    if (toRemove.length > 0) {
      if (targetEntity === "CONTACT") {
        await tx.segmentMember.deleteMany({
          where: {
            segmentId,
            contactId: { in: toRemove },
          },
        });
      } else {
        await tx.segmentMember.deleteMany({
          where: {
            segmentId,
            leadId: { in: toRemove },
          },
        });
      }
    }

    // Add new members
    if (toAdd.length > 0) {
      const newMembers = toAdd.map((entityId) => ({
        segmentId,
        contactId: targetEntity === "CONTACT" ? entityId : null,
        leadId: targetEntity === "LEAD" ? entityId : null,
      }));

      await tx.segmentMember.createMany({
        data: newMembers,
        skipDuplicates: true,
      });
    }

    // Update segment stats
    await tx.segment.update({
      where: { id: segmentId },
      data: {
        memberCount: validIds.length,
        lastCalculatedAt: new Date(),
      },
    });
  });

  return {
    memberCount: validIds.length,
    membersAdded: toAdd.length,
    membersRemoved: toRemove.length,
    calculatedAt: new Date(),
  };
}

/**
 * Get available fields for a target entity
 */
export function getFieldsForEntity(targetEntity: TargetEntity): Array<{ value: string; label: string }> {
  if (targetEntity === "CONTACT") {
    return [
      { value: "email", label: "Email" },
      { value: "firstName", label: "First Name" },
      { value: "lastName", label: "Last Name" },
      { value: "phone", label: "Phone" },
      { value: "title", label: "Job Title" },
      { value: "department", label: "Department" },
      { value: "company", label: "Company (Account Name)" },
      { value: "industry", label: "Industry (Account)" },
      { value: "accountType", label: "Account Type" },
      { value: "isPrimary", label: "Is Primary Contact" },
      { value: "createdAt", label: "Created Date" },
    ];
  } else {
    return [
      { value: "email", label: "Email" },
      { value: "firstName", label: "First Name" },
      { value: "lastName", label: "Last Name" },
      { value: "phone", label: "Phone" },
      { value: "title", label: "Job Title" },
      { value: "company", label: "Company" },
      { value: "source", label: "Lead Source" },
      { value: "status", label: "Status" },
      { value: "createdAt", label: "Created Date" },
    ];
  }
}

/**
 * Preview segment members without saving (for UI preview)
 */
export async function previewSegmentMembers(
  orgId: string,
  targetEntity: TargetEntity,
  rules: SegmentRule[],
  ruleLogic: RuleLogic,
  limit: number = 10
): Promise<{ count: number; preview: Array<{ id: string; name: string; email: string | null }> }> {
  const whereClause = buildPrismaWhereClause(rules, ruleLogic, targetEntity, orgId);

  if (targetEntity === "CONTACT") {
    const [contacts, count] = await Promise.all([
      prisma.contact.findMany({
        where: whereClause,
        select: { id: true, firstName: true, lastName: true, email: true },
        take: limit,
      }),
      prisma.contact.count({ where: whereClause }),
    ]);

    return {
      count,
      preview: contacts.map((c) => ({
        id: c.id,
        name: `${c.firstName} ${c.lastName}`,
        email: c.email,
      })),
    };
  } else {
    const [leads, count] = await Promise.all([
      prisma.lead.findMany({
        where: whereClause,
        select: { id: true, firstName: true, lastName: true, email: true },
        take: limit,
      }),
      prisma.lead.count({ where: whereClause }),
    ]);

    return {
      count,
      preview: leads.map((l) => ({
        id: l.id,
        name: `${l.firstName} ${l.lastName}`,
        email: l.email,
      })),
    };
  }
}
