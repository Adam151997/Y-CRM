# Y CRM - AI-Powered CRM for SMBs

An AI-native Customer Relationship Management platform with voice commands, intelligent assistants, RBAC permissions, and multi-workspace architecture for Sales, Customer Success, and Marketing teams.

![Y CRM](https://img.shields.io/badge/version-1.0.0-blue.svg)
![Next.js](https://img.shields.io/badge/Next.js-14-black.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

## 🌟 Highlights

- **AI-Native** - Built-in AI assistant with 44 tools for natural language CRM operations
- **Voice Commands** - Whisper-powered voice input for hands-free data entry
- **RBAC Permissions** - Granular role-based access control with 4 default roles
- **Multi-Workspace** - Dedicated workspaces for Sales, CS, and Marketing teams
- **Custom Modules** - Create entirely new entities beyond standard CRM objects
- **Dynamic Dashboards** - Drag-and-drop widget system with 15+ widgets
- **MCP Integration** - Model Context Protocol server for external AI agents

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- PostgreSQL database (Railway recommended)
- Redis (Railway recommended)
- Clerk account for authentication (with Organizations enabled)
- Google Gemini API key
- OpenAI API key (for voice transcription)

### Installation

```bash
# Clone the repository
git clone https://github.com/Adam151997/Y-CRM.git
cd Y-CRM

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your credentials

# Push database schema
npm run db:push

# Generate Prisma client
npm run db:generate

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

> **Note:** Default roles (Admin, Manager, Rep, Read Only) are automatically created when a new organization is set up. The organization creator is automatically assigned the Admin role.

---

## 🏗️ Architecture

### Three-Workspace Design

Y CRM is organized into three specialized workspaces:

| Workspace | Purpose | Key Modules |
|-----------|---------|-------------|
| **Sales** | Lead-to-deal pipeline | Leads, Contacts, Accounts, Opportunities, Pipeline, Tasks |
| **Customer Success** | Post-sale management | Tickets, Health Scores, Playbooks, Renewals, Accounts |
| **Marketing** | Campaign management | Campaigns, Segments, Forms, Analytics |

### Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript 5.6 |
| Database | PostgreSQL + Prisma ORM |
| Auth | Clerk (with Organizations) |
| AI/LLM | Google Gemini + Vercel AI SDK |
| Voice | OpenAI Whisper |
| UI | Shadcn UI + Tailwind CSS |
| State | React Query + Zustand |
| Caching | Redis |
| Storage | Vercel Blob + Cloudflare R2 |

---

## ✅ Features

### Core CRM (100% Complete)

| Feature | Status | Description |
|---------|--------|-------------|
| Leads Management | ✅ | Full CRUD, status tracking, conversion, pipeline stages |
| Contacts | ✅ | Individual people management with account linking |
| Accounts | ✅ | Company/organization management with health tracking |
| Opportunities | ✅ | Deal tracking with pipeline stages and probability |
| Pipeline View | ✅ | Kanban board with drag-and-drop functionality |
| Tasks | ✅ | Cross-module task management with due dates |
| Notes | ✅ | Contextual notes on any entity |
| Activities | ✅ | Complete activity timeline across all modules |
| Documents | ✅ | File upload, storage, and document viewer |

### Customer Success (100% Complete)

| Feature | Status | Description |
|---------|--------|-------------|
| Support Tickets | ✅ | Full ticketing with priorities, categories, SLA tracking |
| Health Scores | ✅ | 5-component health scoring (engagement, support, etc.) |
| Playbooks | ✅ | Automated CS workflows with steps and triggers |
| Renewals | ✅ | Contract renewal tracking and forecasting |
| At-Risk Alerts | ✅ | Proactive churn prevention notifications |

### Marketing (100% Complete)

| Feature | Status | Description |
|---------|--------|-------------|
| Campaigns | ✅ | Multi-channel campaign management |
| Segments | ✅ | Dynamic audience segmentation with rules |
| Forms | ✅ | Lead capture form builder with submissions |

### AI & Automation (100% Complete)

| Feature | Status | Description |
|---------|--------|-------------|
| AI Assistant | ✅ | Natural language CRM commands via chat |
| 44 AI Tools | ✅ | Comprehensive tool coverage for all modules |
| MCP Server | ✅ | Model Context Protocol for external AI agents |
| Voice Input | ✅ | Whisper-powered voice transcription |
| Omni-Search | ✅ | Cross-entity search with Cmd+K shortcut |

### Platform & Settings (100% Complete)

| Feature | Status | Description |
|---------|--------|-------------|
| Dynamic Dashboards | ✅ | Drag-and-drop widget system with 15+ widgets |
| RBAC Permissions | ✅ | Role-based access control with 4 default roles |
| Team Management | ✅ | Invite users, assign roles, manage team |
| Custom Fields | ✅ | Extend any module with custom fields |
| Custom Modules | ✅ | Create entirely new CRM modules |
| Pipeline Configuration | ✅ | Custom stages for Leads and Opportunities |
| Organization Branding | ✅ | Custom logo and organization name |
| Audit Logging | ✅ | Complete activity trail with actor tracking |
| Notifications | ✅ | In-app notification system with mark as read |
| Data Import/Export | ✅ | CSV import and export functionality |
| Rate Limiting | ✅ | Redis-based API protection |

---

## 🔐 RBAC (Role-Based Access Control)

### Default Roles

| Role | Permissions | Auto-Assign |
|------|-------------|-------------|
| **Admin** | Full access to all modules and settings | Org creator |
| **Manager** | Full access to all modules | - |
| **Rep** | View, Create, Edit (no Delete) | New members |
| **Read Only** | View only | - |

### Permission Modules

Permissions are configured per module:
- `leads`, `contacts`, `accounts`, `opportunities`
- `tasks`, `documents`, `dashboard`, `pipeline`
- `reports`, `tickets`, `health`, `playbooks`
- `campaigns`, `segments`, `forms`, `settings`

### Permission Actions

Each module supports four actions:
- **view** - See records and lists
- **create** - Add new records
- **edit** - Modify existing records
- **delete** - Remove records

### Using Permissions in Code

**API Routes:**
```typescript
import { checkRoutePermission } from "@/lib/api-permissions";

export async function POST(req: Request) {
  const auth = await getApiAuthContext();
  const error = await checkRoutePermission(auth.userId, auth.orgId, "leads", "create");
  if (error) return error;
  // ... handle request
}
```

**UI Components:**
```typescript
import { CanAccess } from "@/components/can-access";

<CanAccess module="leads" action="delete">
  <DeleteButton />
</CanAccess>
```

---

## 📊 Dashboard Widgets

Y CRM includes 15 customizable dashboard widgets:

### Sales Widgets
- **Quick Stats** - Key metrics overview
- **Pipeline Value** - Total value by stage
- **Leads by Status** - Lead distribution chart
- **Conversion Rate** - Lead conversion metrics
- **Deals Closing** - Upcoming deal closes
- **Recent Activity** - Activity timeline

### CS Widgets
- **Open Tickets** - Active support tickets
- **At-Risk Accounts** - Accounts needing attention
- **Health Distribution** - Health score breakdown
- **Upcoming Renewals** - Contract renewal calendar

### Marketing Widgets
- **Campaign Performance** - Campaign metrics
- **Form Submissions** - Recent form fills
- **Segment Sizes** - Audience segment counts

### Universal Widgets
- **Tasks Due Today** - Daily task list

---

## 🤖 AI Integration

### AI Assistant

The AI Assistant understands natural language commands:

```
"Create a lead for John Smith at Acme Corp"
"Show me all high-priority tickets"
"What's the health score for TechStart Inc?"
"Create a follow-up task for tomorrow"
"Find all opportunities closing this month"
```

### MCP Server

External AI agents (Claude Desktop, etc.) can connect via MCP:

```bash
# SSE Connection
GET /api/mcp/sse?token=<api_key>

# JSON-RPC Messages
POST /api/mcp
X-Session-ID: <session_id>
X-API-Key: <api_key>
```

### AI Tools (44 Total)

**Sales (11):** createLead, searchLeads, updateLead, deleteLead, createContact, searchContacts, createAccount, searchAccounts, createOpportunity, searchOpportunities, createNote

**CS (8):** createTicket, searchTickets, updateTicket, addTicketMessage, getHealthScore, searchAtRiskAccounts, searchPlaybooks, runPlaybook

**Marketing (6):** createCampaign, searchCampaigns, createSegment, searchSegments, createForm, searchForms

**Tasks (3):** createTask, completeTask, searchTasks

**Custom Modules (5):** createCustomModule, createCustomField, createCustomModuleRecord, searchCustomModuleRecords, listCustomModules

**Documents (3):** searchDocuments, getDocumentStats, analyzeDocument

**Integrations (6):** getConnectedIntegrations, sendEmail, createCalendarEvent, sendSlackMessage, createGitHubIssue, executeExternalTool

**Utilities (2):** getDashboardStats, searchActivities

---

## 📁 Project Structure

```
y-crm/
├── app/
│   ├── (auth)/                 # Sign-in, Sign-up pages
│   ├── (dashboard)/            # Main application
│   │   ├── accounts/           # Accounts module
│   │   ├── assistant/          # AI Assistant page
│   │   ├── contacts/           # Contacts module
│   │   ├── cs/                 # Customer Success workspace
│   │   ├── dashboard/          # Main dashboard
│   │   ├── documents/          # Documents module
│   │   ├── leads/              # Leads module
│   │   ├── marketing/          # Marketing workspace
│   │   ├── modules/            # Custom modules
│   │   ├── opportunities/      # Opportunities module
│   │   ├── pipeline/           # Pipeline views
│   │   ├── reports/            # Reports & analytics
│   │   ├── sales/              # Sales workspace
│   │   ├── settings/           # All settings pages
│   │   │   ├── activity/       # Audit log
│   │   │   ├── branding/       # Logo & name
│   │   │   ├── custom-fields/  # Field definitions
│   │   │   ├── data/           # Import/Export
│   │   │   ├── integrations/   # Third-party connections
│   │   │   ├── modules/        # Custom modules
│   │   │   ├── organization/   # Org settings
│   │   │   ├── pipeline/       # Pipeline stages
│   │   │   ├── roles/          # RBAC roles
│   │   │   └── team/           # Team members
│   │   └── tasks/              # Tasks module
│   ├── api/                    # All API routes
│   │   ├── ai/                 # AI chat endpoint
│   │   ├── audit-logs/         # Audit log API
│   │   ├── cs/                 # CS module APIs
│   │   ├── debug/              # Debug endpoints
│   │   ├── marketing/          # Marketing APIs
│   │   ├── mcp/                # MCP server
│   │   ├── notifications/      # Notifications API
│   │   ├── permissions/        # RBAC permissions
│   │   ├── roles/              # Role management
│   │   ├── search/             # Omni-search
│   │   ├── team/               # Team management
│   │   ├── upload/             # File uploads
│   │   └── voice/              # Voice transcription
│   └── select-org/             # Organization selection
├── components/
│   ├── can-access.tsx          # Permission gate component
│   ├── dashboard/              # Dashboard & widgets
│   ├── forms/                  # Entity forms
│   ├── layout/                 # Sidebar, Header, Omni-Search
│   ├── providers/              # Context providers
│   ├── ui/                     # Shadcn components
│   └── voice/                  # Voice input components
├── hooks/
│   ├── use-chat.ts             # AI chat hook
│   └── use-permissions.tsx     # RBAC permission hooks
├── lib/
│   ├── ai/                     # AI agent & tools
│   ├── api-permissions.ts      # API permission helpers
│   ├── auth.ts                 # Auth context & auto-setup
│   ├── audit.ts                # Audit logging
│   ├── cache.ts                # Redis caching
│   ├── db.ts                   # Prisma client
│   ├── mcp/                    # MCP implementation
│   ├── notifications.ts        # Notification helpers
│   ├── permissions.ts          # Permission utilities
│   ├── rate-limit.ts           # Rate limiting
│   ├── validation/             # Zod schemas
│   └── voice/                  # Voice transcription
├── prisma/
│   ├── schema.prisma           # Database schema
│   └── seed.ts                 # Database seeding
└── docs/                       # Documentation
```

---

## 🛠️ Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run db:generate` | Generate Prisma client |
| `npm run db:push` | Push schema to database |
| `npm run db:migrate` | Run migrations |
| `npm run db:studio` | Open Prisma Studio |
| `npm run db:seed` | Seed demo data |
| `npm run mcp:server` | Start standalone MCP server |

---

## 🔐 Environment Variables

### Required

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk public key |
| `CLERK_SECRET_KEY` | Clerk secret key |
| `GOOGLE_GENERATIVE_AI_API_KEY` | Gemini API key |
| `OPENAI_API_KEY` | OpenAI key (for Whisper) |
| `REDIS_URL` | Redis connection string |

### Optional

| Variable | Description |
|----------|-------------|
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob storage token |
| `R2_ENDPOINT` | Cloudflare R2 endpoint |
| `R2_ACCESS_KEY_ID` | R2 access key |
| `R2_SECRET_ACCESS_KEY` | R2 secret key |
| `R2_BUCKET_NAME` | R2 bucket name |
| `COMPOSIO_API_KEY` | Composio integrations key |
| `NEXT_PUBLIC_APP_URL` | App URL (default: localhost:3000) |
| `MCP_API_KEY` | API key for MCP server access |

---

## 📊 Database Schema

### Core Entities
- **Organization** - Multi-tenant with settings and branding
- **Role** - RBAC roles with permissions
- **Permission** - Module-level permission definitions
- **UserRole** - User-to-role assignments
- **Lead** - Sales leads with pipeline stages
- **Contact** - Individual people linked to accounts
- **Account** - Companies with health tracking
- **Opportunity** - Deals with value and probability
- **Task** - Cross-module task management
- **Note** - Contextual notes
- **Activity** - Timeline events
- **Document** - File attachments
- **Notification** - User notifications

### Customer Success
- **Ticket** - Support tickets with messages
- **TicketMessage** - Ticket replies and internal notes
- **AccountHealth** - 5-component health scores
- **Playbook** - Automation workflows
- **PlaybookRun** - Execution instances
- **Renewal** - Contract renewal tracking

### Marketing
- **Campaign** - Multi-channel campaigns
- **Segment** - Dynamic audience segments
- **Form** - Lead capture forms
- **FormSubmission** - Form responses

### Configuration
- **PipelineStage** - Custom pipeline stages
- **CustomFieldDefinition** - Dynamic fields
- **CustomModule** - User-defined modules
- **CustomModuleRecord** - Custom module data
- **DashboardConfig** - Widget layouts

### System
- **AuditLog** - Complete audit trail
- **UsageRecord** - API usage tracking
- **Integration** - Third-party connections

---

## 🚀 Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Connect repository to Vercel
3. Add environment variables
4. Deploy

### Railway

1. Create PostgreSQL + Redis services
2. Deploy from GitHub
3. Add environment variables

### Clerk Setup

1. Enable **Organizations** in Clerk Dashboard
2. Configure OAuth providers (Google, etc.)
3. Set redirect URLs for your domain

---

## 📄 Documentation

- [API Documentation](docs/API.md) - REST API reference
- [MCP Integration](docs/MCP.md) - AI agent integration guide
- [User Guide](docs/USER_GUIDE.md) - End-user documentation
- [Performance Guide](docs/PERFORMANCE.md) - Optimization tips

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing`)
5. Open a Pull Request

---

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

---

## 🙏 Acknowledgments

- [Next.js](https://nextjs.org/) - React framework
- [Clerk](https://clerk.com/) - Authentication
- [Prisma](https://prisma.io/) - Database ORM
- [Shadcn UI](https://ui.shadcn.com/) - UI components
- [Vercel AI SDK](https://sdk.vercel.ai/) - AI integration
- [Google Gemini](https://ai.google.dev/) - LLM provider
- [OpenAI Whisper](https://openai.com/research/whisper) - Voice transcription

---

## 🎨 Branding

Y CRM uses **Electric Coral** (#FF5757) as its primary brand color, featuring a distinctive Y logo with connection nodes representing the interconnected nature of customer relationships.
