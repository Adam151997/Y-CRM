/**
 * CSV Import API
 * POST /api/import - Import records from CSV
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";
import prisma from "@/lib/db";
import { createAuditLog, AuditModule } from "@/lib/audit";
import Papa from "papaparse";

export const runtime = "nodejs";
export const maxDuration = 60;

type ImportModule = "leads" | "contacts" | "accounts" | "opportunities" | "tasks";

// Map import module names to audit module names
const AUDIT_MODULE_MAP: Record<ImportModule, AuditModule> = {
  leads: "LEAD",
  contacts: "CONTACT",
  accounts: "ACCOUNT",
  opportunities: "OPPORTUNITY",
  tasks: "TASK",
};

interface ImportResult {
  success: boolean;
  imported: number;
  failed: number;
  errors: Array<{ row: number; error: string }>;
}

const FIELD_MAPPINGS: Record<ImportModule, Record<string, string>> = {
  leads: {
    "first_name": "firstName",
    "firstname": "firstName",
    "first name": "firstName",
    "last_name": "lastName",
    "lastname": "lastName",
    "last name": "lastName",
    "email": "email",
    "phone": "phone",
    "company": "company",
    "title": "title",
    "source": "source",
    "status": "status",
  },
  contacts: {
    "first_name": "firstName",
    "firstname": "firstName",
    "first name": "firstName",
    "last_name": "lastName",
    "lastname": "lastName",
    "last name": "lastName",
    "email": "email",
    "phone": "phone",
    "title": "title",
    "department": "department",
  },
  accounts: {
    "name": "name",
    "company": "name",
    "company_name": "name",
    "website": "website",
    "phone": "phone",
    "industry": "industry",
    "type": "type",
    "annual_revenue": "annualRevenue",
    "employees": "employeeCount",
    "employee_count": "employeeCount",
  },
  opportunities: {
    "name": "name",
    "deal_name": "name",
    "value": "value",
    "amount": "value",
    "probability": "probability",
    "expected_close_date": "expectedCloseDate",
    "close_date": "expectedCloseDate",
  },
  tasks: {
    "title": "title",
    "description": "description",
    "due_date": "dueDate",
    "priority": "priority",
    "status": "status",
    "task_type": "taskType",
  },
};

const VALID_VALUES: Record<string, Record<string, string[]>> = {
  leads: {
    status: ["NEW", "CONTACTED", "QUALIFIED", "CONVERTED", "LOST"],
    source: ["REFERRAL", "WEBSITE", "COLD_CALL", "LINKEDIN", "TRADE_SHOW", "OTHER"],
  },
  contacts: {},
  accounts: {
    type: ["PROSPECT", "CUSTOMER", "PARTNER", "VENDOR"],
  },
  opportunities: {},
  tasks: {
    priority: ["LOW", "MEDIUM", "HIGH", "URGENT"],
    status: ["PENDING", "IN_PROGRESS", "COMPLETED", "CANCELLED"],
    taskType: ["CALL", "EMAIL", "MEETING", "FOLLOW_UP", "OTHER"],
  },
};

function normalizeFieldName(field: string): string {
  return field.toLowerCase().trim().replace(/[^a-z0-9_]/g, "_");
}

function mapFields(row: Record<string, string>, module: ImportModule): Record<string, unknown> {
  const mapping = FIELD_MAPPINGS[module];
  const result: Record<string, unknown> = {};

  for (const [csvField, value] of Object.entries(row)) {
    const normalizedField = normalizeFieldName(csvField);
    const mappedField = mapping[normalizedField] || mapping[csvField.toLowerCase()];
    
    if (mappedField && value !== undefined && value !== "") {
      // Handle special field types
      if (mappedField === "annualRevenue" || mappedField === "value") {
        const numValue = parseFloat(value.replace(/[^0-9.-]/g, ""));
        result[mappedField] = isNaN(numValue) ? null : numValue;
      } else if (mappedField === "employeeCount" || mappedField === "probability") {
        const intValue = parseInt(value.replace(/[^0-9-]/g, ""), 10);
        result[mappedField] = isNaN(intValue) ? null : intValue;
      } else if (mappedField === "expectedCloseDate" || mappedField === "dueDate") {
        const dateValue = new Date(value);
        result[mappedField] = isNaN(dateValue.getTime()) ? null : dateValue;
      } else {
        // Validate enum values
        const validValues = VALID_VALUES[module]?.[mappedField];
        if (validValues) {
          const upperValue = value.toUpperCase();
          result[mappedField] = validValues.includes(upperValue) ? upperValue : validValues[0];
        } else {
          result[mappedField] = value.trim();
        }
      }
    }
  }

  return result;
}

async function importRecords(
  module: ImportModule,
  records: Record<string, string>[],
  orgId: string,
  userId: string
): Promise<ImportResult> {
  const result: ImportResult = {
    success: true,
    imported: 0,
    failed: 0,
    errors: [],
  };

  for (let i = 0; i < records.length; i++) {
    const row = records[i];
    const rowNum = i + 2; // Account for header row and 0-index

    try {
      const data = mapFields(row, module);

      // Skip empty rows
      if (Object.keys(data).length === 0) continue;

      // Validate required fields
      if (module === "leads" && (!data.firstName || !data.lastName)) {
        result.errors.push({ row: rowNum, error: "Missing required fields: firstName, lastName" });
        result.failed++;
        continue;
      }

      if (module === "contacts" && (!data.firstName || !data.lastName)) {
        result.errors.push({ row: rowNum, error: "Missing required fields: firstName, lastName" });
        result.failed++;
        continue;
      }

      if (module === "accounts" && !data.name) {
        result.errors.push({ row: rowNum, error: "Missing required field: name" });
        result.failed++;
        continue;
      }

      if (module === "tasks" && !data.title) {
        result.errors.push({ row: rowNum, error: "Missing required field: title" });
        result.failed++;
        continue;
      }

      // Create record based on module
      switch (module) {
        case "leads":
          await prisma.lead.create({
            data: {
              orgId,
              firstName: data.firstName as string,
              lastName: data.lastName as string,
              email: data.email as string | undefined,
              phone: data.phone as string | undefined,
              company: data.company as string | undefined,
              title: data.title as string | undefined,
              source: data.source as string | undefined,
              status: (data.status as string) || "NEW",
            },
          });
          break;

        case "contacts":
          await prisma.contact.create({
            data: {
              orgId,
              firstName: data.firstName as string,
              lastName: data.lastName as string,
              email: data.email as string | undefined,
              phone: data.phone as string | undefined,
              title: data.title as string | undefined,
              department: data.department as string | undefined,
            },
          });
          break;

        case "accounts":
          await prisma.account.create({
            data: {
              orgId,
              name: data.name as string,
              website: data.website as string | undefined,
              phone: data.phone as string | undefined,
              industry: data.industry as string | undefined,
              type: data.type as string | undefined,
              annualRevenue: data.annualRevenue as number | undefined,
              employeeCount: data.employeeCount as number | undefined,
            },
          });
          break;

        case "tasks":
          await prisma.task.create({
            data: {
              orgId,
              title: data.title as string,
              description: data.description as string | undefined,
              dueDate: data.dueDate as Date | undefined,
              priority: (data.priority as string) || "MEDIUM",
              status: (data.status as string) || "PENDING",
              taskType: data.taskType as string | undefined,
              createdById: userId,
              createdByType: "USER",
            },
          });
          break;
      }

      result.imported++;
    } catch (error) {
      result.errors.push({
        row: rowNum,
        error: error instanceof Error ? error.message : "Unknown error",
      });
      result.failed++;
    }
  }

  // Create audit log
  await createAuditLog({
    orgId,
    action: "IMPORT",
    module: AUDIT_MODULE_MAP[module],
    actorType: "USER",
    actorId: userId,
    metadata: {
      imported: result.imported,
      failed: result.failed,
      totalRows: records.length,
    },
  });

  result.success = result.failed === 0;
  return result;
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthContext();
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const module = formData.get("module") as ImportModule | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!module || !["leads", "contacts", "accounts", "opportunities", "tasks"].includes(module)) {
      return NextResponse.json({ error: "Invalid module" }, { status: 400 });
    }

    // Parse CSV
    const text = await file.text();
    const { data, errors } = Papa.parse<Record<string, string>>(text, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim(),
    });

    if (errors.length > 0) {
      return NextResponse.json(
        { error: "CSV parsing error", details: errors },
        { status: 400 }
      );
    }

    if (data.length === 0) {
      return NextResponse.json({ error: "No data found in CSV" }, { status: 400 });
    }

    // Import records
    const result = await importRecords(module, data, auth.orgId, auth.userId);

    return NextResponse.json(result);
  } catch (error) {
    console.error("[Import API] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Import failed" },
      { status: 500 }
    );
  }
}
