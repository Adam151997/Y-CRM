# Changelog

All notable changes to Y CRM are documented in this file.

---

## [1.0.0] - 2024-12-11

### 🎉 Initial Release

Y CRM v1.0.0 represents the complete AI-powered CRM platform for small and medium businesses.

---

### Features

#### Core CRM
- **Leads Management** - Full CRUD with status tracking, pipeline stages, and conversion
- **Contacts** - Individual contact management with account linking
- **Accounts** - Company management with health tracking integration
- **Opportunities** - Deal tracking with value, probability, and pipeline stages
- **Pipeline View** - Kanban board with drag-and-drop functionality
- **Tasks** - Cross-module task management with due dates and priorities
- **Notes** - Contextual notes attached to any entity
- **Activities** - Complete activity timeline across all modules
- **Documents** - File upload, storage, and integrated document viewer

#### Customer Success
- **Support Tickets** - Full ticketing system with priorities, categories, SLA tracking
- **Ticket Messages** - Threaded replies with internal notes
- **Health Scores** - 5-component health scoring system
- **Playbooks** - Automated CS workflows with configurable steps
- **Renewals** - Contract renewal tracking and forecasting
- **At-Risk Alerts** - Proactive churn prevention

#### Marketing
- **Campaigns** - Multi-channel campaign management
- **Segments** - Dynamic audience segmentation with rule builder
- **Forms** - Lead capture form builder with submissions tracking

#### AI & Automation
- **AI Assistant** - Natural language CRM commands via chat interface
- **44 AI Tools** - Comprehensive tool coverage for all modules
- **MCP Server** - Model Context Protocol for external AI agents
- **Voice Input** - OpenAI Whisper-powered voice transcription
- **Omni-Search** - Cross-entity search with Cmd+K shortcut

#### Platform & Settings
- **Dynamic Dashboards** - Drag-and-drop widget system with 15+ widgets
- **RBAC Permissions** - Complete role-based access control system
- **Team Management** - Invite users, assign roles, manage team
- **Custom Fields** - Extend any module with custom fields
- **Custom Modules** - Create entirely new CRM modules
- **Pipeline Configuration** - Custom stages for Leads and Opportunities
- **Organization Branding** - Custom logo and organization name
- **Audit Logging** - Complete activity trail with actor tracking
- **Notifications** - In-app notification system
- **Data Import/Export** - CSV import and export functionality
- **Rate Limiting** - Redis-based API protection

---

### Technical Stack
- Next.js 14 (App Router)
- TypeScript 5.6
- PostgreSQL + Prisma ORM
- Clerk Authentication (with Organizations)
- Google Gemini + Vercel AI SDK
- OpenAI Whisper
- Shadcn UI + Tailwind CSS
- React Query + Zustand
- Redis (caching/rate limiting)
- Vercel Blob + Cloudflare R2 (storage)

---

### RBAC System

#### Default Roles
- **Admin** - Full access (auto-assigned to org creator)
- **Manager** - Full access
- **Rep** - View/Create/Edit access (default for new members)
- **Read Only** - View only

#### Features
- Auto-role creation for new organizations
- Auto-admin assignment to org creators
- Auto-default role for new team members
- Permission enforcement on API routes
- Permission-gated UI components
- Role editor with permissions grid

---

### Dashboard Widgets

#### Sales Widgets
- Quick Stats
- Pipeline Value
- Leads by Status
- Conversion Rate
- Deals Closing
- Recent Activity

#### CS Widgets
- Open Tickets
- At-Risk Accounts
- Health Distribution
- Upcoming Renewals

#### Marketing Widgets
- Campaign Performance
- Form Submissions
- Segment Sizes

#### Universal Widgets
- Tasks Due Today

---

### AI Tools (44 Total)

| Category | Count | Tools |
|----------|-------|-------|
| Sales | 11 | createLead, searchLeads, updateLead, deleteLead, createContact, searchContacts, createAccount, searchAccounts, createOpportunity, searchOpportunities, createNote |
| CS | 8 | createTicket, searchTickets, updateTicket, addTicketMessage, getHealthScore, searchAtRiskAccounts, searchPlaybooks, runPlaybook |
| Marketing | 6 | createCampaign, searchCampaigns, createSegment, searchSegments, createForm, searchForms |
| Tasks | 3 | createTask, completeTask, searchTasks |
| Custom | 5 | createCustomModule, createCustomField, createCustomModuleRecord, searchCustomModuleRecords, listCustomModules |
| Documents | 3 | searchDocuments, getDocumentStats, analyzeDocument |
| Integrations | 6 | getConnectedIntegrations, sendEmail, createCalendarEvent, sendSlackMessage, createGitHubIssue, executeExternalTool |
| Utilities | 2 | getDashboardStats, searchActivities |

---

### API Endpoints

#### Core APIs
- `/api/leads` - Leads CRUD
- `/api/contacts` - Contacts CRUD
- `/api/accounts` - Accounts CRUD
- `/api/opportunities` - Opportunities CRUD
- `/api/tasks` - Tasks CRUD
- `/api/notes` - Notes CRUD
- `/api/documents` - Documents CRUD

#### CS APIs
- `/api/cs/tickets` - Tickets CRUD
- `/api/cs/health` - Health scores
- `/api/cs/playbooks` - Playbooks CRUD
- `/api/cs/renewals` - Renewals CRUD

#### Marketing APIs
- `/api/marketing/campaigns` - Campaigns CRUD
- `/api/marketing/segments` - Segments CRUD
- `/api/marketing/forms` - Forms CRUD

#### Platform APIs
- `/api/ai` - AI chat endpoint
- `/api/mcp` - MCP server (SSE + JSON-RPC)
- `/api/voice` - Voice transcription
- `/api/search` - Omni-search
- `/api/notifications` - Notifications
- `/api/audit-logs` - Audit logs
- `/api/roles` - Role management
- `/api/team` - Team management
- `/api/permissions` - RBAC permissions

---

### Deployment
- Vercel (recommended)
- Railway (PostgreSQL + Redis)
- Clerk (Authentication)

---

### Documentation
- README.md - Project overview
- docs/API.md - REST API reference
- docs/MCP.md - AI agent integration
- docs/RBAC.md - Permissions guide
- docs/ARCHITECTURE.md - System architecture
- docs/USER_GUIDE.md - End-user documentation
- docs/PERFORMANCE.md - Optimization tips
