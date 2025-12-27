// AI Module exports
export * from "./providers";
export {
  // Sales
  createLeadTool,
  searchLeadsTool,
  updateLeadTool,
  createContactTool,
  searchContactsTool,
  createAccountTool,
  searchAccountsTool,
  createOpportunityTool,
  searchOpportunitiesTool,
  // Tasks
  createTaskTool,
  completeTaskTool,
  searchTasksTool,
  // Notes
  createNoteTool,
  // Dashboard
  getDashboardStatsTool,
  // CS - Tickets
  createTicketTool,
  searchTicketsTool,
  updateTicketTool,
  addTicketMessageTool,
  // CS - Health
  getHealthScoreTool,
  searchAtRiskAccountsTool,
  // CS - Playbooks
  searchPlaybooksTool,
  runPlaybookTool,
  // CS - Renewals
  createRenewalTool,
  searchRenewalsTool,
  updateRenewalTool,
  getUpcomingRenewalsTool,
  // Marketing - Campaigns
  createCampaignTool,
  searchCampaignsTool,
  // Marketing - Segments
  createSegmentTool,
  searchSegmentsTool,
  // Marketing - Forms
  createFormTool,
  searchFormsTool,
  // Custom Modules
  createCustomModuleTool,
  createCustomFieldTool,
  createCustomModuleRecordTool,
  searchCustomModuleRecordsTool,
  listCustomModulesTool,
  // Documents
  searchDocumentsTool,
  getDocumentStatsTool,
  analyzeDocumentTool,
  // Search
  semanticSearchTool,
  // Reports
  createReportTool,
} from "./tools";
export { executeAgent, parseIntent, generateConfirmation, getCRMTools } from "./agent";
export type { AgentContext, AgentResult } from "./agent";
