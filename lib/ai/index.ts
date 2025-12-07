// AI Module exports
export * from "./providers";
export {
  createLeadTool,
  searchLeadsTool,
  updateLeadTool,
  createContactTool,
  searchContactsTool,
  createAccountTool,
  searchAccountsTool,
  createTaskTool,
  completeTaskTool,
  searchTasksTool,
  createOpportunityTool,
  searchOpportunitiesTool,
  createNoteTool,
  getDashboardStatsTool,
  semanticSearchTool,
} from "./tools";
export { executeAgent, parseIntent, generateConfirmation, getCRMTools } from "./agent";
export type { AgentContext, AgentResult } from "./agent";
