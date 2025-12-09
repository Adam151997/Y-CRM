/**
 * CSV Export API
 * GET /api/export?module=leads - Export records to CSV
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";
import prisma from "@/lib/db";
import { createAuditLog, AuditModule } from "@/lib/audit";
import Papa from "papaparse";

type ExportModule = "leads" | "contacts" | "accounts" | "opportunities" | "tasks" | "tickets";

// Map export module names to audit module names
const AUDIT_MODULE_MAP: Record<ExportModule, AuditModule> = {
  leads: "LEAD",
  contacts: "CONTACT",
  accounts: "ACCOUNT",
  opportunities: "OPPORTUNITY",
  tasks: "TASK",
  tickets: "TICKET",
};

const MODULE_CONFIGS: Record<ExportModule, {
  fields: string[];
  headers: string[];
}> = {
  leads: {
    fields: ["firstName", "lastName", "email", "phone", "company", "title", "source", "status", "createdAt"],
    headers: ["First Name", "Last Name", "Email", "Phone", "Company", "Title", "Source", "Status", "Created At"],
  },
  contacts: {
    fields: ["firstName", "lastName", "email", "phone", "title", "department", "isPrimary", "createdAt"],
    headers: ["First Name", "Last Name", "Email", "Phone", "Title", "Department", "Is Primary", "Created At"],
  },
  accounts: {
    fields: ["name", "website", "phone", "industry", "type", "rating", "annualRevenue", "employees", "createdAt"],
    headers: ["Name", "Website", "Phone", "Industry", "Type", "Rating", "Annual Revenue", "Employees", "Created At"],
  },
  opportunities: {
    fields: ["name", "value", "currency", "probability", "expectedCloseDate", "closedWon", "createdAt"],
    headers: ["Name", "Value", "Currency", "Probability", "Expected Close Date", "Closed Won", "Created At"],
  },
  tasks: {
    fields: ["title", "description", "dueDate", "priority", "status", "taskType", "completedAt", "createdAt"],
    headers: ["Title", "Description", "Due Date", "Priority", "Status", "Task Type", "Completed At", "Created At"],
  },
  tickets: {
    fields: ["subject", "description", "status", "priority", "category", "resolvedAt", "createdAt"],
    headers: ["Subject", "Description", "Status", "Priority", "Category", "Resolved At", "Created At"],
  },
};

async function fetchRecords(module: ExportModule, orgId: string, filters?: Record<string, string>) {
  const where: Record<string, unknown> = { orgId };

  // Apply filters if provided
  if (filters?.status) where.status = filters.status;
  if (filters?.source) where.source = filters.source;
  if (filters?.priority) where.priority = filters.priority;

  switch (module) {
    case "leads":
      return prisma.lead.findMany({
        where,
        orderBy: { createdAt: "desc" },
      });
    case "contacts":
      return prisma.contact.findMany({
        where,
        orderBy: { createdAt: "desc" },
      });
    case "accounts":
      return prisma.account.findMany({
        where,
        orderBy: { createdAt: "desc" },
      });
    case "opportunities":
      return prisma.opportunity.findMany({
        where,
        orderBy: { createdAt: "desc" },
      });
    case "tasks":
      return prisma.task.findMany({
        where,
        orderBy: { createdAt: "desc" },
      });
    case "tickets":
      return prisma.ticket.findMany({
        where,
        orderBy: { createdAt: "desc" },
      });
    default:
      throw new Error(`Unknown module: ${module}`);
  }
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "number") return value.toString();
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function transformRecords(
  records: Record<string, unknown>[],
  config: { fields: string[]; headers: string[] }
): Record<string, string>[] {
  return records.map((record) => {
    const row: Record<string, string> = {};
    config.fields.forEach((field, index) => {
      row[config.headers[index]] = formatValue(record[field]);
    });
    return row;
  });
}

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthContext();
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const module = searchParams.get("module") as ExportModule | null;
    const format = searchParams.get("format") || "csv";

    if (!module || !MODULE_CONFIGS[module]) {
      return NextResponse.json(
        { error: "Invalid module. Valid options: leads, contacts, accounts, opportunities, tasks, tickets" },
        { status: 400 }
      );
    }

    // Get filters from query params
    const filters: Record<string, string> = {};
    if (searchParams.get("status")) filters.status = searchParams.get("status")!;
    if (searchParams.get("source")) filters.source = searchParams.get("source")!;
    if (searchParams.get("priority")) filters.priority = searchParams.get("priority")!;

    // Fetch records
    const records = await fetchRecords(module, auth.orgId, filters);

    if (records.length === 0) {
      return NextResponse.json({ error: "No records found" }, { status: 404 });
    }

    // Transform records
    const config = MODULE_CONFIGS[module];
    const transformedRecords = transformRecords(records as Record<string, unknown>[], config);

    // Create audit log
    await createAuditLog({
      orgId: auth.orgId,
      action: "EXPORT",
      module: AUDIT_MODULE_MAP[module],
      actorType: "USER",
      actorId: auth.userId,
      metadata: {
        format,
        recordCount: records.length,
        filters,
      },
    });

    if (format === "json") {
      return NextResponse.json({
        module,
        count: records.length,
        data: transformedRecords,
      });
    }

    // Generate CSV
    const csv = Papa.unparse(transformedRecords, {
      quotes: true,
      header: true,
    });

    // Return as downloadable file
    const filename = `${module}_export_${new Date().toISOString().split("T")[0]}.csv`;
    
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("[Export API] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Export failed" },
      { status: 500 }
    );
  }
}
