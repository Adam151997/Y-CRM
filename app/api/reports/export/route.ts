import { NextRequest, NextResponse } from "next/server";
import { getApiAuthContext } from "@/lib/auth";
import prisma from "@/lib/db";
import { z } from "zod";

export const dynamic = "force-dynamic";

const exportSchema = z.object({
  format: z.enum(["csv", "json"]),
  reportType: z.enum(["summary", "leads", "opportunities", "invoices", "tasks", "activities"]),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  preset: z.string().optional(),
});

function getDateRange(preset?: string, startDate?: string, endDate?: string): { start: Date; end: Date } {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  if (startDate && endDate) {
    return {
      start: new Date(startDate),
      end: new Date(endDate + "T23:59:59.999Z"),
    };
  }

  switch (preset) {
    case "thisMonth":
      return {
        start: new Date(now.getFullYear(), now.getMonth(), 1),
        end: now,
      };
    case "lastMonth":
      return {
        start: new Date(now.getFullYear(), now.getMonth() - 1, 1),
        end: new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999),
      };
    case "thisQuarter":
      const quarterStart = Math.floor(now.getMonth() / 3) * 3;
      return {
        start: new Date(now.getFullYear(), quarterStart, 1),
        end: now,
      };
    case "thisYear":
      return {
        start: new Date(now.getFullYear(), 0, 1),
        end: now,
      };
    case "last30days":
      return {
        start: new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000),
        end: now,
      };
    default:
      return {
        start: new Date(2020, 0, 1),
        end: now,
      };
  }
}

function convertToCSV(data: Record<string, unknown>[], columns: { key: string; label: string }[]): string {
  if (data.length === 0) return "";
  
  const header = columns.map(c => `"${c.label}"`).join(",");
  
  const rows = data.map(row => {
    return columns.map(col => {
      const value = row[col.key];
      if (value === null || value === undefined) return '""';
      if (typeof value === "object") return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
      return `"${String(value).replace(/"/g, '""')}"`;
    }).join(",");
  });

  return [header, ...rows].join("\n");
}

export async function GET(request: NextRequest) {
  try {
    const auth = await getApiAuthContext();
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const params = {
      format: searchParams.get("format") || "csv",
      reportType: searchParams.get("reportType") || "summary",
      startDate: searchParams.get("startDate") || undefined,
      endDate: searchParams.get("endDate") || undefined,
      preset: searchParams.get("preset") || undefined,
    };

    const validated = exportSchema.parse(params);
    const { start, end } = getDateRange(validated.preset, validated.startDate, validated.endDate);
    const dateFilter = { gte: start, lte: end };
    const orgId = auth.orgId;

    let data: Record<string, unknown>[] = [];
    let columns: { key: string; label: string }[] = [];
    let filename = "";

    switch (validated.reportType) {
      case "leads": {
        const leads = await prisma.lead.findMany({
          where: { orgId, createdAt: dateFilter },
          orderBy: { createdAt: "desc" },
          include: { pipelineStage: { select: { name: true } } },
        });
        data = leads.map(l => ({
          firstName: l.firstName,
          lastName: l.lastName,
          email: l.email || "",
          phone: l.phone || "",
          company: l.company || "",
          title: l.title || "",
          source: l.source || "",
          status: l.status,
          stage: l.pipelineStage?.name || "",
          createdAt: l.createdAt.toISOString().split("T")[0],
        }));
        columns = [
          { key: "firstName", label: "First Name" },
          { key: "lastName", label: "Last Name" },
          { key: "email", label: "Email" },
          { key: "phone", label: "Phone" },
          { key: "company", label: "Company" },
          { key: "title", label: "Title" },
          { key: "source", label: "Source" },
          { key: "status", label: "Status" },
          { key: "stage", label: "Pipeline Stage" },
          { key: "createdAt", label: "Created Date" },
        ];
        filename = `leads-${start.toISOString().split("T")[0]}`;
        break;
      }

      case "opportunities": {
        const opps = await prisma.opportunity.findMany({
          where: { orgId, createdAt: dateFilter },
          orderBy: { createdAt: "desc" },
          include: {
            account: { select: { name: true } },
            stage: { select: { name: true } },
          },
        });
        data = opps.map(o => ({
          name: o.name,
          account: o.account.name,
          value: Number(o.value),
          currency: o.currency,
          probability: o.probability,
          stage: o.stage.name,
          expectedCloseDate: o.expectedCloseDate?.toISOString().split("T")[0] || "",
          actualCloseDate: o.actualCloseDate?.toISOString().split("T")[0] || "",
          closedWon: o.closedWon === null ? "Open" : o.closedWon ? "Won" : "Lost",
          createdAt: o.createdAt.toISOString().split("T")[0],
        }));
        columns = [
          { key: "name", label: "Opportunity Name" },
          { key: "account", label: "Account" },
          { key: "value", label: "Value" },
          { key: "currency", label: "Currency" },
          { key: "probability", label: "Probability %" },
          { key: "stage", label: "Stage" },
          { key: "expectedCloseDate", label: "Expected Close" },
          { key: "actualCloseDate", label: "Actual Close" },
          { key: "closedWon", label: "Status" },
          { key: "createdAt", label: "Created Date" },
        ];
        filename = `opportunities-${start.toISOString().split("T")[0]}`;
        break;
      }

      case "invoices": {
        const invoices = await prisma.invoice.findMany({
          where: { orgId, issueDate: dateFilter },
          orderBy: { issueDate: "desc" },
          include: {
            account: { select: { name: true } },
            contact: { select: { firstName: true, lastName: true } },
          },
        });
        data = invoices.map(i => ({
          invoiceNumber: i.invoiceNumber,
          account: i.account.name,
          contact: i.contact ? `${i.contact.firstName} ${i.contact.lastName}` : "",
          status: i.status,
          issueDate: i.issueDate.toISOString().split("T")[0],
          dueDate: i.dueDate.toISOString().split("T")[0],
          subtotal: Number(i.subtotal),
          taxAmount: Number(i.taxAmount),
          total: Number(i.total),
          amountPaid: Number(i.amountPaid),
          amountDue: Number(i.amountDue),
          currency: i.currency,
        }));
        columns = [
          { key: "invoiceNumber", label: "Invoice #" },
          { key: "account", label: "Account" },
          { key: "contact", label: "Contact" },
          { key: "status", label: "Status" },
          { key: "issueDate", label: "Issue Date" },
          { key: "dueDate", label: "Due Date" },
          { key: "subtotal", label: "Subtotal" },
          { key: "taxAmount", label: "Tax" },
          { key: "total", label: "Total" },
          { key: "amountPaid", label: "Paid" },
          { key: "amountDue", label: "Due" },
          { key: "currency", label: "Currency" },
        ];
        filename = `invoices-${start.toISOString().split("T")[0]}`;
        break;
      }

      case "tasks": {
        const tasks = await prisma.task.findMany({
          where: { orgId, createdAt: dateFilter },
          orderBy: { createdAt: "desc" },
        });
        data = tasks.map(t => ({
          title: t.title,
          description: t.description || "",
          status: t.status,
          priority: t.priority,
          taskType: t.taskType || "",
          workspace: t.workspace,
          dueDate: t.dueDate?.toISOString().split("T")[0] || "",
          completedAt: t.completedAt?.toISOString().split("T")[0] || "",
          createdAt: t.createdAt.toISOString().split("T")[0],
        }));
        columns = [
          { key: "title", label: "Title" },
          { key: "description", label: "Description" },
          { key: "status", label: "Status" },
          { key: "priority", label: "Priority" },
          { key: "taskType", label: "Type" },
          { key: "workspace", label: "Workspace" },
          { key: "dueDate", label: "Due Date" },
          { key: "completedAt", label: "Completed" },
          { key: "createdAt", label: "Created Date" },
        ];
        filename = `tasks-${start.toISOString().split("T")[0]}`;
        break;
      }

      case "activities": {
        const activities = await prisma.activity.findMany({
          where: { orgId, performedAt: dateFilter },
          orderBy: { performedAt: "desc" },
        });
        data = activities.map(a => ({
          type: a.type,
          subject: a.subject,
          description: a.description || "",
          workspace: a.workspace,
          duration: a.duration || "",
          performedAt: a.performedAt.toISOString().split("T")[0],
        }));
        columns = [
          { key: "type", label: "Type" },
          { key: "subject", label: "Subject" },
          { key: "description", label: "Description" },
          { key: "workspace", label: "Workspace" },
          { key: "duration", label: "Duration (min)" },
          { key: "performedAt", label: "Date" },
        ];
        filename = `activities-${start.toISOString().split("T")[0]}`;
        break;
      }

      case "summary":
      default: {
        const [leadCount, oppCount, wonOpps, taskCount, completedTasks, invoiceStats] = await prisma.$transaction([
          prisma.lead.count({ where: { orgId, createdAt: dateFilter } }),
          prisma.opportunity.count({ where: { orgId, createdAt: dateFilter } }),
          prisma.opportunity.aggregate({
            where: { orgId, actualCloseDate: dateFilter, closedWon: true },
            _sum: { value: true },
            _count: true,
          }),
          prisma.task.count({ where: { orgId, createdAt: dateFilter } }),
          prisma.task.count({ where: { orgId, createdAt: dateFilter, status: "COMPLETED" } }),
          prisma.invoice.aggregate({
            where: { orgId, issueDate: dateFilter },
            _sum: { total: true, amountPaid: true },
            _count: true,
          }),
        ]);

        data = [
          { metric: "Total Leads", value: leadCount },
          { metric: "Total Opportunities", value: oppCount },
          { metric: "Deals Won", value: wonOpps._count },
          { metric: "Revenue Won", value: Number(wonOpps._sum.value || 0) },
          { metric: "Total Tasks", value: taskCount },
          { metric: "Tasks Completed", value: completedTasks },
          { metric: "Task Completion Rate", value: taskCount > 0 ? `${((completedTasks / taskCount) * 100).toFixed(1)}%` : "0%" },
          { metric: "Total Invoiced", value: Number(invoiceStats._sum.total || 0) },
          { metric: "Total Collected", value: Number(invoiceStats._sum.amountPaid || 0) },
          { metric: "Invoice Count", value: invoiceStats._count },
        ];
        columns = [
          { key: "metric", label: "Metric" },
          { key: "value", label: "Value" },
        ];
        filename = `summary-${start.toISOString().split("T")[0]}`;
        break;
      }
    }

    if (validated.format === "json") {
      return NextResponse.json({
        reportType: validated.reportType,
        dateRange: { start: start.toISOString(), end: end.toISOString() },
        data,
        exportedAt: new Date().toISOString(),
      });
    }

    const csv = convertToCSV(data, columns);
    
    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}.csv"`,
      },
    });
  } catch (error) {
    console.error("Error exporting report:", error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid parameters", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to export report" },
      { status: 500 }
    );
  }
}
