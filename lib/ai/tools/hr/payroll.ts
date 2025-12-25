/**
 * Payroll Tools for Human Resources Workspace
 */

import { z } from "zod";
import { tool } from "ai";
import prisma from "@/lib/db";
import { createAuditLog } from "@/lib/audit";
import { logToolExecution, handleToolError, formatCurrency } from "../helpers";

export function createPayrollTools(orgId: string, userId: string) {
  return {
    createPayroll: createPayrollTool(orgId, userId),
    searchPayrolls: searchPayrollsTool(orgId),
    updatePayrollStatus: updatePayrollStatusTool(orgId, userId),
    getPayrollSummary: getPayrollSummaryTool(orgId),
    generatePayrollRun: generatePayrollRunTool(orgId, userId),
  };
}

const createPayrollTool = (orgId: string, userId: string) =>
  tool({
    description: "Create a new payroll record for an employee",
    parameters: z.object({
      employeeId: z.string().optional().describe("Employee ID (UUID) - use if you have it"),
      employeeName: z.string().optional().describe("Employee name to search for"),
      payPeriod: z.string().describe("Pay period (YYYY-MM format, e.g., '2024-01')"),
      baseSalary: z.number().describe("Base salary amount"),
      overtime: z.number().optional().describe("Overtime amount"),
      bonus: z.number().optional().describe("Bonus amount"),
      commission: z.number().optional().describe("Commission amount"),
      allowances: z.number().optional().describe("Allowances amount"),
      taxDeduction: z.number().optional().describe("Tax deduction amount"),
      insuranceDeduction: z.number().optional().describe("Insurance deduction amount"),
      retirementDeduction: z.number().optional().describe("Retirement/401k deduction amount"),
      otherDeductions: z.number().optional().describe("Other deductions amount"),
      currency: z.string().optional().describe("Currency code (default: USD)"),
      paymentMethod: z.string().optional().describe("Payment method: BANK_TRANSFER, CHECK, CASH"),
      notes: z.string().optional().describe("Notes about this payroll"),
    }),
    execute: async (params) => {
      logToolExecution("createPayroll", params);
      try {
        // Resolve employee ID
        let resolvedEmployeeId = params.employeeId;

        if (!resolvedEmployeeId && params.employeeName) {
          const employee = await prisma.employee.findFirst({
            where: {
              orgId,
              OR: [
                { firstName: { contains: params.employeeName, mode: "insensitive" } },
                { lastName: { contains: params.employeeName, mode: "insensitive" } },
              ],
            },
          });
          if (employee) {
            resolvedEmployeeId = employee.id;
          } else {
            return {
              success: false,
              errorCode: "NOT_FOUND",
              message: `Employee "${params.employeeName}" not found.`,
            };
          }
        }

        if (!resolvedEmployeeId) {
          return {
            success: false,
            errorCode: "VALIDATION",
            message: "Either employeeId or employeeName is required.",
          };
        }

        const employee = await prisma.employee.findFirst({
          where: { id: resolvedEmployeeId, orgId },
        });

        if (!employee) {
          return { success: false, message: "Employee not found" };
        }

        // Check for duplicate payroll
        const existing = await prisma.payroll.findFirst({
          where: {
            orgId,
            employeeId: resolvedEmployeeId,
            payPeriod: params.payPeriod,
          },
        });

        if (existing) {
          return {
            success: true,
            payrollId: existing.id,
            alreadyExisted: true,
            message: `Payroll for ${employee.firstName} ${employee.lastName} for period ${params.payPeriod} already exists (ID: ${existing.id})`,
          };
        }

        // Calculate totals
        const grossPay =
          params.baseSalary +
          (params.overtime || 0) +
          (params.bonus || 0) +
          (params.commission || 0) +
          (params.allowances || 0);

        const totalDeductions =
          (params.taxDeduction || 0) +
          (params.insuranceDeduction || 0) +
          (params.retirementDeduction || 0) +
          (params.otherDeductions || 0);

        const netPay = grossPay - totalDeductions;

        // Parse pay period to get start/end dates
        const [year, month] = params.payPeriod.split("-").map(Number);
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0);

        const payroll = await prisma.payroll.create({
          data: {
            orgId,
            employeeId: resolvedEmployeeId,
            payPeriod: params.payPeriod,
            startDate,
            endDate,
            baseSalary: params.baseSalary,
            overtime: params.overtime || 0,
            bonus: params.bonus || 0,
            commission: params.commission || 0,
            allowances: params.allowances || 0,
            grossPay,
            taxDeduction: params.taxDeduction || 0,
            insuranceDeduction: params.insuranceDeduction || 0,
            retirementDeduction: params.retirementDeduction || 0,
            otherDeductions: params.otherDeductions || 0,
            totalDeductions,
            netPay,
            currency: params.currency || "USD",
            paymentMethod: (params.paymentMethod as "BANK_TRANSFER" | "CHECK" | "CASH") || "BANK_TRANSFER",
            notes: params.notes,
            status: "DRAFT",
            createdById: userId,
            createdByType: "AI_AGENT",
          },
        });

        await createAuditLog({
          orgId,
          action: "CREATE",
          module: "PAYROLL",
          recordId: payroll.id,
          actorType: "AI_AGENT",
          actorId: userId,
          newState: payroll as unknown as Record<string, unknown>,
          metadata: { source: "ai_assistant" },
        });

        return {
          success: true,
          payrollId: payroll.id,
          message: `Created payroll for ${employee.firstName} ${employee.lastName} (${params.payPeriod}): Gross ${formatCurrency(grossPay, params.currency || "USD")}, Net ${formatCurrency(netPay, params.currency || "USD")}`,
        };
      } catch (error) {
        return handleToolError(error, "createPayroll");
      }
    },
  });

const searchPayrollsTool = (orgId: string) =>
  tool({
    description: "Search for payroll records",
    parameters: z.object({
      employeeId: z.string().optional().describe("Filter by employee ID (UUID)"),
      employeeName: z.string().optional().describe("Filter by employee name"),
      payPeriod: z.string().optional().describe("Filter by pay period (YYYY-MM)"),
      status: z.string().optional().describe("Filter by status: DRAFT, PENDING, APPROVED, PROCESSED, PAID"),
      limit: z.number().optional().describe("Maximum results (1-20, default 10)"),
    }),
    execute: async ({ employeeId, employeeName, payPeriod, status, limit = 10 }) => {
      logToolExecution("searchPayrolls", { employeeId, employeeName, payPeriod, status, limit });
      try {
        const where: Record<string, unknown> = { orgId };

        if (status) where.status = status;
        if (payPeriod) where.payPeriod = payPeriod;

        if (employeeId) {
          where.employeeId = employeeId;
        } else if (employeeName) {
          where.employee = {
            OR: [
              { firstName: { contains: employeeName, mode: "insensitive" } },
              { lastName: { contains: employeeName, mode: "insensitive" } },
            ],
          };
        }

        const payrolls = await prisma.payroll.findMany({
          where,
          take: Math.min(limit, 20),
          orderBy: { payPeriod: "desc" },
          include: {
            employee: {
              select: { firstName: true, lastName: true, employeeId: true, department: true },
            },
          },
        });

        return {
          success: true,
          count: payrolls.length,
          payrolls: payrolls.map((p) => ({
            id: p.id,
            employee: `${p.employee.firstName} ${p.employee.lastName}`,
            employeeNumber: p.employee.employeeId,
            department: p.employee.department,
            payPeriod: p.payPeriod,
            grossPay: Number(p.grossPay),
            totalDeductions: Number(p.totalDeductions),
            netPay: Number(p.netPay),
            currency: p.currency,
            status: p.status,
          })),
        };
      } catch (error) {
        return { ...handleToolError(error, "searchPayrolls"), count: 0, payrolls: [] };
      }
    },
  });

const updatePayrollStatusTool = (orgId: string, userId: string) =>
  tool({
    description: "Update payroll status (approve, process, mark as paid)",
    parameters: z.object({
      payrollId: z.string().describe("Payroll ID (UUID)"),
      status: z.enum(["PENDING", "APPROVED", "PROCESSED", "PAID"]).describe("New status"),
    }),
    execute: async ({ payrollId, status }) => {
      logToolExecution("updatePayrollStatus", { payrollId, status });
      try {
        const payroll = await prisma.payroll.findFirst({
          where: { id: payrollId, orgId },
          include: { employee: true },
        });

        if (!payroll) {
          return { success: false, message: "Payroll not found" };
        }

        // Validate status transition
        const validTransitions: Record<string, string[]> = {
          DRAFT: ["PENDING"],
          PENDING: ["APPROVED", "DRAFT"],
          APPROVED: ["PROCESSED", "PENDING"],
          PROCESSED: ["PAID", "APPROVED"],
          PAID: [],
        };

        if (!validTransitions[payroll.status]?.includes(status)) {
          return {
            success: false,
            message: `Cannot change status from ${payroll.status} to ${status}. Valid transitions: ${validTransitions[payroll.status].join(", ") || "none"}`,
          };
        }

        const updateData: Record<string, unknown> = { status };
        if (status === "PAID") {
          updateData.paymentDate = new Date();
        }

        const updated = await prisma.payroll.update({
          where: { id: payrollId },
          data: updateData,
        });

        await createAuditLog({
          orgId,
          action: "UPDATE",
          module: "PAYROLL",
          recordId: payroll.id,
          actorType: "AI_AGENT",
          actorId: userId,
          previousState: payroll as unknown as Record<string, unknown>,
          newState: updated as unknown as Record<string, unknown>,
          metadata: { source: "ai_assistant", statusChange: { from: payroll.status, to: status } },
        });

        return {
          success: true,
          message: `Updated payroll for ${payroll.employee.firstName} ${payroll.employee.lastName} (${payroll.payPeriod}) to ${status}`,
        };
      } catch (error) {
        return handleToolError(error, "updatePayrollStatus");
      }
    },
  });

const getPayrollSummaryTool = (orgId: string) =>
  tool({
    description: "Get payroll summary statistics for a period",
    parameters: z.object({
      payPeriod: z.string().optional().describe("Pay period (YYYY-MM), default: current month"),
    }),
    execute: async ({ payPeriod }) => {
      logToolExecution("getPayrollSummary", { payPeriod });
      try {
        const period = payPeriod || `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;

        const payrolls = await prisma.payroll.findMany({
          where: {
            orgId,
            payPeriod: period,
          },
        });

        const statusCounts: Record<string, number> = {};
        let totalGross = 0;
        let totalDeductions = 0;
        let totalNet = 0;

        for (const p of payrolls) {
          statusCounts[p.status] = (statusCounts[p.status] || 0) + 1;
          totalGross += Number(p.grossPay);
          totalDeductions += Number(p.totalDeductions);
          totalNet += Number(p.netPay);
        }

        return {
          success: true,
          payPeriod: period,
          summary: {
            totalRecords: payrolls.length,
            byStatus: statusCounts,
            totals: {
              grossPay: totalGross,
              deductions: totalDeductions,
              netPay: totalNet,
            },
          },
        };
      } catch (error) {
        return handleToolError(error, "getPayrollSummary");
      }
    },
  });

const generatePayrollRunTool = (orgId: string, userId: string) =>
  tool({
    description: "Generate payroll records for all active employees for a pay period",
    parameters: z.object({
      payPeriod: z.string().describe("Pay period (YYYY-MM format)"),
      department: z.string().optional().describe("Filter by department (optional)"),
    }),
    execute: async ({ payPeriod, department }) => {
      logToolExecution("generatePayrollRun", { payPeriod, department });
      try {
        // Get active employees with salaries
        const where: Record<string, unknown> = {
          orgId,
          status: "ACTIVE",
          salary: { not: null },
        };

        if (department) {
          where.department = { contains: department, mode: "insensitive" };
        }

        const employees = await prisma.employee.findMany({
          where,
        });

        if (employees.length === 0) {
          return {
            success: false,
            message: department
              ? `No active employees with salary found in department "${department}"`
              : "No active employees with salary found",
          };
        }

        // Check for existing payrolls
        const existing = await prisma.payroll.findMany({
          where: {
            orgId,
            payPeriod,
            employeeId: { in: employees.map((e) => e.id) },
          },
        });

        const existingEmployeeIds = new Set(existing.map((p) => p.employeeId));
        const toCreate = employees.filter((e) => !existingEmployeeIds.has(e.id));

        if (toCreate.length === 0) {
          return {
            success: true,
            message: `Payrolls already exist for all ${employees.length} employees for period ${payPeriod}`,
            created: 0,
            skipped: employees.length,
          };
        }

        // Parse pay period
        const [year, month] = payPeriod.split("-").map(Number);
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0);

        // Create payrolls
        const created = await prisma.payroll.createMany({
          data: toCreate.map((e) => {
            const baseSalary = Number(e.salary) || 0;
            // Calculate monthly salary if annual
            const monthlySalary = e.salaryType === "ANNUAL" ? baseSalary / 12 : baseSalary;

            return {
              orgId,
              employeeId: e.id,
              payPeriod,
              startDate,
              endDate,
              baseSalary: monthlySalary,
              overtime: 0,
              bonus: 0,
              commission: 0,
              allowances: 0,
              grossPay: monthlySalary,
              taxDeduction: 0,
              insuranceDeduction: 0,
              retirementDeduction: 0,
              otherDeductions: 0,
              totalDeductions: 0,
              netPay: monthlySalary,
              currency: e.currency || "USD",
              paymentMethod: "BANK_TRANSFER",
              status: "DRAFT",
              createdById: userId,
              createdByType: "AI_AGENT",
            };
          }),
        });

        return {
          success: true,
          message: `Generated ${created.count} payroll records for period ${payPeriod}`,
          created: created.count,
          skipped: existingEmployeeIds.size,
        };
      } catch (error) {
        return handleToolError(error, "generatePayrollRun");
      }
    },
  });
