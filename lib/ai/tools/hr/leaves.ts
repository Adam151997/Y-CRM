/**
 * Leave Tools for Human Resources Workspace
 */

import { z } from "zod";
import { tool } from "ai";
import prisma from "@/lib/db";
import { createAuditLog } from "@/lib/audit";
import { logToolExecution, handleToolError } from "../helpers";

export function createLeaveTools(orgId: string, userId: string) {
  return {
    createLeave: createLeaveTool(orgId, userId),
    searchLeaves: searchLeavesTool(orgId),
    approveLeave: approveLeaveTool(orgId, userId),
    getLeaveBalance: getLeaveBalanceTool(orgId),
    getPendingLeaves: getPendingLeavesTool(orgId),
  };
}

const createLeaveTool = (orgId: string, userId: string) =>
  tool({
    description: "Create a new leave request for an employee",
    parameters: z.object({
      employeeId: z.string().optional().describe("Employee ID (UUID) - use if you have it"),
      employeeName: z.string().optional().describe("Employee name to search for - use if you don't have the ID"),
      leaveType: z.string().describe("Leave type: ANNUAL, SICK, PERSONAL, MATERNITY, PATERNITY, UNPAID, OTHER"),
      startDate: z.string().describe("Start date (ISO format, e.g., '2024-01-15')"),
      endDate: z.string().describe("End date (ISO format, e.g., '2024-01-20')"),
      reason: z.string().optional().describe("Reason for leave request"),
      halfDay: z.boolean().optional().describe("Is this a half-day leave? (default: false)"),
    }),
    execute: async (params) => {
      logToolExecution("createLeave", params);
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
              message: `Employee "${params.employeeName}" not found. Please check the name and try again.`,
            };
          }
        }

        if (!resolvedEmployeeId) {
          return {
            success: false,
            errorCode: "VALIDATION",
            message: "Either employeeId or employeeName is required to create a leave request.",
          };
        }

        // Verify employee exists
        const employee = await prisma.employee.findFirst({
          where: { id: resolvedEmployeeId, orgId },
        });

        if (!employee) {
          return { success: false, message: "Employee not found" };
        }

        const startDate = new Date(params.startDate);
        const endDate = new Date(params.endDate);

        // Calculate days
        const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
        const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
        const totalDays = params.halfDay ? 0.5 : days;

        // Check for overlapping leaves
        const overlapping = await prisma.leave.findFirst({
          where: {
            employeeId: resolvedEmployeeId,
            status: { in: ["PENDING", "APPROVED"] },
            OR: [
              { startDate: { lte: endDate }, endDate: { gte: startDate } },
            ],
          },
        });

        if (overlapping) {
          return {
            success: false,
            message: `Leave request overlaps with existing leave from ${overlapping.startDate.toLocaleDateString()} to ${overlapping.endDate.toLocaleDateString()}`,
          };
        }

        const leave = await prisma.leave.create({
          data: {
            orgId,
            employeeId: resolvedEmployeeId,
            type: params.leaveType,
            startDate,
            endDate,
            days: totalDays,
            reason: params.reason,
            status: "PENDING",
            createdById: userId,
            createdByType: "AI_AGENT",
          },
        });

        await createAuditLog({
          orgId,
          action: "CREATE",
          module: "LEAVE",
          recordId: leave.id,
          actorType: "AI_AGENT",
          actorId: userId,
          newState: leave as unknown as Record<string, unknown>,
          metadata: { source: "ai_assistant" },
        });

        return {
          success: true,
          leaveId: leave.id,
          message: `Created ${params.leaveType.toLowerCase()} leave request for ${employee.firstName} ${employee.lastName}: ${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()} (${totalDays} day${totalDays !== 1 ? "s" : ""})`,
        };
      } catch (error) {
        return handleToolError(error, "createLeave");
      }
    },
  });

const searchLeavesTool = (orgId: string) =>
  tool({
    description: "Search for leave requests",
    parameters: z.object({
      employeeId: z.string().optional().describe("Filter by employee ID (UUID)"),
      employeeName: z.string().optional().describe("Filter by employee name"),
      status: z.string().optional().describe("Filter by status: PENDING, APPROVED, REJECTED, CANCELLED"),
      leaveType: z.string().optional().describe("Filter by type: ANNUAL, SICK, PERSONAL, etc."),
      startDateFrom: z.string().optional().describe("Filter leaves starting from this date"),
      startDateTo: z.string().optional().describe("Filter leaves starting until this date"),
      limit: z.number().optional().describe("Maximum results (1-20, default 10)"),
    }),
    execute: async ({ employeeId, employeeName, status, leaveType, startDateFrom, startDateTo, limit = 10 }) => {
      logToolExecution("searchLeaves", { employeeId, employeeName, status, leaveType, limit });
      try {
        const where: Record<string, unknown> = { orgId };

        if (status) where.status = status;
        if (leaveType) where.type = leaveType;

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

        if (startDateFrom || startDateTo) {
          where.startDate = {};
          if (startDateFrom) (where.startDate as Record<string, unknown>).gte = new Date(startDateFrom);
          if (startDateTo) (where.startDate as Record<string, unknown>).lte = new Date(startDateTo);
        }

        const leaves = await prisma.leave.findMany({
          where,
          take: Math.min(limit, 20),
          orderBy: { startDate: "desc" },
          include: {
            employee: {
              select: { firstName: true, lastName: true, employeeId: true },
            },
          },
        });

        return {
          success: true,
          count: leaves.length,
          leaves: leaves.map((l: { id: string; employee: { firstName: string; lastName: string; employeeId: string }; type: string; startDate: Date; endDate: Date; days: unknown; status: string; reason: string | null }) => ({
            id: l.id,
            employee: `${l.employee.firstName} ${l.employee.lastName}`,
            employeeNumber: l.employee.employeeId,
            leaveType: l.type,
            startDate: l.startDate.toISOString().split("T")[0],
            endDate: l.endDate.toISOString().split("T")[0],
            totalDays: Number(l.days),
            status: l.status,
            reason: l.reason,
          })),
        };
      } catch (error) {
        return { ...handleToolError(error, "searchLeaves"), count: 0, leaves: [] };
      }
    },
  });

const approveLeaveTool = (orgId: string, userId: string) =>
  tool({
    description: "Approve or reject a leave request",
    parameters: z.object({
      leaveId: z.string().describe("Leave request ID (UUID)"),
      action: z.enum(["approve", "reject"]).describe("Action: approve or reject"),
      comments: z.string().optional().describe("Comments for the decision"),
    }),
    execute: async ({ leaveId, action, comments }) => {
      logToolExecution("approveLeave", { leaveId, action });
      try {
        const leave = await prisma.leave.findFirst({
          where: { id: leaveId, orgId },
          include: { employee: true },
        });

        if (!leave) {
          return { success: false, message: "Leave request not found" };
        }

        if (leave.status !== "PENDING") {
          return {
            success: false,
            message: `Cannot ${action} leave request - current status is ${leave.status}`,
          };
        }

        const newStatus = action === "approve" ? "APPROVED" : "REJECTED";

        const updated = await prisma.leave.update({
          where: { id: leaveId },
          data: {
            status: newStatus,
            approvedById: userId,
            approvedAt: new Date(),
            ...(action === "reject" && comments ? { rejectionReason: comments } : {}),
          },
        });

        await createAuditLog({
          orgId,
          action: "UPDATE",
          module: "LEAVE",
          recordId: leave.id,
          actorType: "AI_AGENT",
          actorId: userId,
          previousState: leave as unknown as Record<string, unknown>,
          newState: updated as unknown as Record<string, unknown>,
          metadata: { source: "ai_assistant", action },
        });

        return {
          success: true,
          message: `${action === "approve" ? "Approved" : "Rejected"} leave request for ${leave.employee.firstName} ${leave.employee.lastName}`,
        };
      } catch (error) {
        return handleToolError(error, "approveLeave");
      }
    },
  });

const getLeaveBalanceTool = (orgId: string) =>
  tool({
    description: "Get leave balance for an employee",
    parameters: z.object({
      employeeId: z.string().optional().describe("Employee ID (UUID)"),
      employeeName: z.string().optional().describe("Employee name to search for"),
      year: z.number().optional().describe("Year to check (default: current year)"),
    }),
    execute: async ({ employeeId, employeeName, year }) => {
      logToolExecution("getLeaveBalance", { employeeId, employeeName, year });
      try {
        let resolvedEmployeeId = employeeId;

        if (!resolvedEmployeeId && employeeName) {
          const employee = await prisma.employee.findFirst({
            where: {
              orgId,
              OR: [
                { firstName: { contains: employeeName, mode: "insensitive" } },
                { lastName: { contains: employeeName, mode: "insensitive" } },
              ],
            },
          });
          if (employee) {
            resolvedEmployeeId = employee.id;
          } else {
            return { success: false, message: `Employee "${employeeName}" not found` };
          }
        }

        if (!resolvedEmployeeId) {
          return { success: false, message: "Either employeeId or employeeName is required" };
        }

        const employee = await prisma.employee.findFirst({
          where: { id: resolvedEmployeeId, orgId },
        });

        if (!employee) {
          return { success: false, message: "Employee not found" };
        }

        const targetYear = year || new Date().getFullYear();
        const yearStart = new Date(targetYear, 0, 1);
        const yearEnd = new Date(targetYear, 11, 31);

        const leaves = await prisma.leave.findMany({
          where: {
            employeeId: resolvedEmployeeId,
            status: "APPROVED",
            startDate: { gte: yearStart, lte: yearEnd },
          },
        });

        // Aggregate by leave type
        const usedByType: Record<string, number> = {};
        for (const leave of leaves) {
          usedByType[leave.type] = (usedByType[leave.type] || 0) + Number(leave.days);
        }

        // Standard allocation (could be made configurable)
        const allocation = {
          ANNUAL: 20,
          SICK: 10,
          PERSONAL: 5,
        };

        return {
          success: true,
          employee: `${employee.firstName} ${employee.lastName}`,
          year: targetYear,
          balance: {
            annual: {
              allocated: allocation.ANNUAL,
              used: usedByType.ANNUAL || 0,
              remaining: allocation.ANNUAL - (usedByType.ANNUAL || 0),
            },
            sick: {
              allocated: allocation.SICK,
              used: usedByType.SICK || 0,
              remaining: allocation.SICK - (usedByType.SICK || 0),
            },
            personal: {
              allocated: allocation.PERSONAL,
              used: usedByType.PERSONAL || 0,
              remaining: allocation.PERSONAL - (usedByType.PERSONAL || 0),
            },
          },
          otherLeavesTaken: Object.entries(usedByType)
            .filter(([type]) => !["ANNUAL", "SICK", "PERSONAL"].includes(type))
            .map(([type, days]) => ({ type, days })),
        };
      } catch (error) {
        return handleToolError(error, "getLeaveBalance");
      }
    },
  });

const getPendingLeavesTool = (orgId: string) =>
  tool({
    description: "Get all pending leave requests that need approval",
    parameters: z.object({
      limit: z.number().optional().describe("Maximum results (1-50, default 20)"),
    }),
    execute: async ({ limit = 20 }) => {
      logToolExecution("getPendingLeaves", { limit });
      try {
        const leaves = await prisma.leave.findMany({
          where: {
            orgId,
            status: "PENDING",
          },
          take: Math.min(limit, 50),
          orderBy: { createdAt: "asc" },
          include: {
            employee: {
              select: { firstName: true, lastName: true, employeeId: true, department: true },
            },
          },
        });

        return {
          success: true,
          count: leaves.length,
          pendingLeaves: leaves.map((l: { id: string; employee: { firstName: string; lastName: string; employeeId: string; department: string | null }; type: string; startDate: Date; endDate: Date; days: unknown; reason: string | null; createdAt: Date }) => ({
            id: l.id,
            employee: `${l.employee.firstName} ${l.employee.lastName}`,
            employeeNumber: l.employee.employeeId,
            department: l.employee.department,
            leaveType: l.type,
            startDate: l.startDate.toISOString().split("T")[0],
            endDate: l.endDate.toISOString().split("T")[0],
            totalDays: Number(l.days),
            reason: l.reason,
            requestedAt: l.createdAt.toISOString(),
          })),
        };
      } catch (error) {
        return { ...handleToolError(error, "getPendingLeaves"), count: 0, pendingLeaves: [] };
      }
    },
  });
