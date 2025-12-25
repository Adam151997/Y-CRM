/**
 * Employee Tools for Human Resources Workspace
 */

import { z } from "zod";
import { tool } from "ai";
import prisma from "@/lib/db";
import { createAuditLog } from "@/lib/audit";
import { logToolExecution, handleToolError } from "../helpers";

export function createEmployeeTools(orgId: string, userId: string) {
  return {
    createEmployee: createEmployeeTool(orgId, userId),
    searchEmployees: searchEmployeesTool(orgId),
    updateEmployee: updateEmployeeTool(orgId, userId),
    getEmployee: getEmployeeTool(orgId),
  };
}

const createEmployeeTool = (orgId: string, userId: string) =>
  tool({
    description: "Create a new employee record in the HR workspace.",
    parameters: z.object({
      firstName: z.string().describe("Employee first name (required)"),
      lastName: z.string().describe("Employee last name (required)"),
      email: z.string().email().describe("Work email address (required)"),
      phone: z.string().optional().describe("Phone number"),
      department: z.string().optional().describe("Department name"),
      position: z.string().optional().describe("Job title/position"),
      employmentType: z.string().optional().describe("Employment type: FULL_TIME, PART_TIME, CONTRACT, INTERN"),
      salary: z.number().optional().describe("Base salary amount"),
      salaryType: z.string().optional().describe("Salary type: HOURLY, MONTHLY, ANNUAL"),
      currency: z.string().optional().describe("Currency code (e.g., USD, EUR)"),
      hireDate: z.string().optional().describe("Hire date (ISO format or 'today')"),
      managerId: z.string().optional().describe("Manager's employee ID (UUID)"),
    }),
    execute: async (params) => {
      logToolExecution("createEmployee", params);
      try {
        // Check for duplicate by email
        const existing = await prisma.employee.findFirst({
          where: {
            orgId,
            email: params.email.toLowerCase(),
          },
        });

        if (existing) {
          return {
            success: true,
            employeeId: existing.id,
            employeeNumber: existing.employeeId,
            alreadyExisted: true,
            message: `Employee "${existing.firstName} ${existing.lastName}" already exists with email ${params.email} (ID: ${existing.id})`,
          };
        }

        // Parse join date (defaults to today if not provided)
        const joinDate = params.hireDate
          ? (params.hireDate === "today" ? new Date() : new Date(params.hireDate))
          : new Date();

        // Generate employee ID
        const employeeCount = await prisma.employee.count({ where: { orgId } });
        const employeeId = `EMP-${String(employeeCount + 1).padStart(4, "0")}`;

        const employee = await prisma.employee.create({
          data: {
            orgId,
            firstName: params.firstName,
            lastName: params.lastName,
            email: params.email.toLowerCase(),
            phone: params.phone,
            department: params.department,
            position: params.position,
            employeeId,
            employmentType: (params.employmentType as "FULL_TIME" | "PART_TIME" | "CONTRACT" | "INTERN") || "FULL_TIME",
            salary: params.salary,
            salaryType: (params.salaryType as "HOURLY" | "MONTHLY" | "ANNUAL") || "MONTHLY",
            currency: params.currency || "USD",
            joinDate,
            managerId: params.managerId,
            status: "ACTIVE",
            createdById: userId,
            createdByType: "AI_AGENT",
          },
        });

        await createAuditLog({
          orgId,
          action: "CREATE",
          module: "EMPLOYEE",
          recordId: employee.id,
          actorType: "AI_AGENT",
          actorId: userId,
          newState: employee as unknown as Record<string, unknown>,
          metadata: { source: "ai_assistant" },
        });

        return {
          success: true,
          employeeId: employee.id,
          employeeNumber: employee.employeeId,
          message: `Created employee: ${employee.firstName} ${employee.lastName} (${employee.employeeId})`,
        };
      } catch (error) {
        return handleToolError(error, "createEmployee");
      }
    },
  });

const searchEmployeesTool = (orgId: string) =>
  tool({
    description: "Search for employees in the HR system",
    parameters: z.object({
      query: z.string().optional().describe("Search term for name, email, or employee ID"),
      department: z.string().optional().describe("Filter by department"),
      status: z.string().optional().describe("Filter by status: ACTIVE, ON_LEAVE, TERMINATED"),
      employmentType: z.string().optional().describe("Filter by type: FULL_TIME, PART_TIME, CONTRACT, INTERN"),
      limit: z.number().optional().describe("Maximum results (1-20, default 10)"),
    }),
    execute: async ({ query, department, status, employmentType, limit = 10 }) => {
      logToolExecution("searchEmployees", { query, department, status, employmentType, limit });
      try {
        const where: Record<string, unknown> = { orgId };

        if (status) where.status = status;
        if (department) where.department = { contains: department, mode: "insensitive" };
        if (employmentType) where.employmentType = employmentType;

        if (query) {
          where.OR = [
            { firstName: { contains: query, mode: "insensitive" } },
            { lastName: { contains: query, mode: "insensitive" } },
            { email: { contains: query, mode: "insensitive" } },
            { employeeId: { contains: query, mode: "insensitive" } },
          ];
        }

        const employees = await prisma.employee.findMany({
          where,
          take: Math.min(limit, 20),
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            employeeId: true,
            firstName: true,
            lastName: true,
            email: true,
            department: true,
            position: true,
            status: true,
            employmentType: true,
            joinDate: true,
          },
        });

        return {
          success: true,
          count: employees.length,
          employees: employees.map((e: { id: string; employeeId: string; firstName: string; lastName: string; email: string; department: string | null; position: string | null; status: string; employmentType: string; joinDate: Date | null }) => ({
            id: e.id,
            employeeNumber: e.employeeId,
            name: `${e.firstName} ${e.lastName}`,
            email: e.email,
            department: e.department,
            position: e.position,
            status: e.status,
            employmentType: e.employmentType,
            hireDate: e.joinDate?.toISOString(),
          })),
        };
      } catch (error) {
        return { ...handleToolError(error, "searchEmployees"), count: 0, employees: [] };
      }
    },
  });

const updateEmployeeTool = (orgId: string, userId: string) =>
  tool({
    description: "Update an employee's information",
    parameters: z.object({
      employeeId: z.string().describe("Employee ID (UUID) to update"),
      department: z.string().optional().describe("New department"),
      position: z.string().optional().describe("New position/title"),
      salary: z.number().optional().describe("New salary amount"),
      status: z.string().optional().describe("New status: ACTIVE, ON_LEAVE, TERMINATED"),
      managerId: z.string().optional().describe("New manager ID (UUID)"),
      terminationDate: z.string().optional().describe("Termination date (for TERMINATED status)"),
    }),
    execute: async ({ employeeId, ...updates }) => {
      logToolExecution("updateEmployee", { employeeId, ...updates });
      try {
        const existing = await prisma.employee.findFirst({
          where: { id: employeeId, orgId },
        });

        if (!existing) {
          return { success: false, message: "Employee not found" };
        }

        const updateData: Record<string, unknown> = { ...updates };

        if (updates.terminationDate) {
          updateData.terminationDate = new Date(updates.terminationDate);
        }

        const employee = await prisma.employee.update({
          where: { id: employeeId },
          data: updateData,
        });

        await createAuditLog({
          orgId,
          action: "UPDATE",
          module: "EMPLOYEE",
          recordId: employee.id,
          actorType: "AI_AGENT",
          actorId: userId,
          previousState: existing as unknown as Record<string, unknown>,
          newState: employee as unknown as Record<string, unknown>,
          metadata: { source: "ai_assistant" },
        });

        return {
          success: true,
          message: `Updated employee: ${employee.firstName} ${employee.lastName}`,
        };
      } catch (error) {
        return handleToolError(error, "updateEmployee");
      }
    },
  });

const getEmployeeTool = (orgId: string) =>
  tool({
    description: "Get detailed information about a specific employee",
    parameters: z.object({
      employeeId: z.string().describe("Employee ID (UUID) or employee number"),
    }),
    execute: async ({ employeeId }) => {
      logToolExecution("getEmployee", { employeeId });
      try {
        const employee = await prisma.employee.findFirst({
          where: {
            orgId,
            OR: [
              { id: employeeId },
              { employeeId: employeeId },
            ],
          },
          include: {
            _count: {
              select: { leaves: true, payrolls: true },
            },
          },
        });

        if (!employee) {
          return { success: false, message: "Employee not found" };
        }

        // Fetch manager name if managerId exists
        let managerName: string | null = null;
        if (employee.managerId) {
          const manager = await prisma.employee.findFirst({
            where: { id: employee.managerId },
            select: { firstName: true, lastName: true },
          });
          if (manager) {
            managerName = `${manager.firstName} ${manager.lastName}`;
          }
        }

        return {
          success: true,
          employee: {
            id: employee.id,
            employeeNumber: employee.employeeId,
            name: `${employee.firstName} ${employee.lastName}`,
            email: employee.email,
            phone: employee.phone,
            department: employee.department,
            position: employee.position,
            status: employee.status,
            employmentType: employee.employmentType,
            hireDate: employee.joinDate?.toISOString(),
            salary: employee.salary ? Number(employee.salary) : null,
            salaryType: employee.salaryType,
            currency: employee.currency,
            manager: managerName,
            leaveCount: employee._count.leaves,
            payrollCount: employee._count.payrolls,
          },
        };
      } catch (error) {
        return handleToolError(error, "getEmployee");
      }
    },
  });
