/**
 * Human Resources Workspace Tools
 *
 * Tools for managing employees, leaves, and payroll
 */

import { createEmployeeTools } from "./employees";
import { createLeaveTools } from "./leaves";
import { createPayrollTools } from "./payroll";

/**
 * Create all HR tools
 */
export function createHRTools(orgId: string, userId: string) {
  return {
    ...createEmployeeTools(orgId, userId),
    ...createLeaveTools(orgId, userId),
    ...createPayrollTools(orgId, userId),
  };
}

// Re-export individual tool creators for selective imports
export { createEmployeeTools } from "./employees";
export { createLeaveTools } from "./leaves";
export { createPayrollTools } from "./payroll";
