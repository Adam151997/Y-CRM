# Y CRM - AI-Powered CRM for SMBs

An AI-native Customer Relationship Management platform with voice commands, intelligent assistants, and multi-workspace architecture for Sales, Customer Success, and Marketing teams.

![Y CRM](https://img.shields.io/badge/version-1.0.0-blue.svg)
![Next.js](https://img.shields.io/badge/Next.js-14-black.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- PostgreSQL database (Railway recommended)
- Redis (Railway recommended)
- Clerk account for authentication
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

# (Optional) Seed demo data
npm run db:seed

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## 🏗️ Architecture

### Three-Workspace Design

Y CRM is organized into three specialized workspaces:

| Workspace | Purpose | Modules |
|-----------|---------|---------|
| **Sales** | Lead-to-deal pipeline | Leads, Contacts, Accounts, Opportunities, Pipeline, Tasks |
| **Customer Success** | Post-sale management | Tickets, Health Scores, Playbooks, Accounts, Tasks |
| **Marketing** | Campaign management | Campaigns, Segments, Forms |

### Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript 5.6 |
| Database | PostgreSQL + Prisma ORM |
| Auth | Clerk |
| AI/LLM | Google Gemini + Vercel AI SDK |
| Voice | OpenAI Whisper |
| UI | Shadcn UI + Tailwind CSS |
| State | React Query + Zustand |
| Caching | Redis |
| Storage | Cloudflare R2 |

---

## ✅ Features

### Core CRM

- [x] **Leads Management** - Full CRUD, status tracking, conversion
- [x] **Contacts** - Individual people management with account linking
- [x] **Accounts** - Company/organization management
- [x] **Opportunities** - Deal tracking with pipeline stages
- [x] **Pipeline View** - Kanban board with drag-and-drop
- [x] **Tasks** - Cross-module task management
- [x] **Notes** - Contextual notes on any entity
- [x] **Activities** - Complete activity timeline

### Customer Success

- [x] **Support Tickets** - Full ticketing system with priorities
- [x] **Health Scores** - Account health tracking (5 components)
- [x] **Playbooks** - Automated CS workflows
- [x] **At-Risk Alerts** - Proactive churn prevention

### Marketing

- [x] **Campaigns** - Multi-channel campaign management
- [x] **Segments** - Dynamic audience segmentation
- [x] **Forms** - Lead capture form builder

### AI & Automation

- [x] **AI Assistant** - Natural language CRM commands
- [x] **44 AI Tools** - Comprehensive tool coverage
- [x] **MCP Server** - Model Context Protocol for external AI agents
- [x] **Voice Input** - Whisper-powered voice commands
- [x] **Smart Search** - Cross-entity semantic search

### Platform

- [x] **Dynamic Dashboards** - Drag-and-drop widget system
- [x] **Custom Fields** - Extend any module
- [x] **Custom Modules** - Create entirely new modules
- [x] **Audit Logging** - Complete activity trail
- [x] **Rate Limiting** - Redis-based protection
- [x] **Document Storage** - R2-powered file management
- [x] **Reports** - Visual analytics

---

## 📁 Project Structure

```
y-crm/
├── app/
│   ├── (auth)/              # Auth pages
│   ├── (dashboard)/         # Main app
│   │   ├── sales/           # Sales workspace
│   │   ├── cs/              # Customer Success workspace
│   │   ├── marketing/       # Marketing workspace
│   │   ├── dashboard/       # Main dashboard
│   │   ├── settings/        # Settings pages
│   │   └── ...
│   └── api/                 # API routes
│       ├── leads/
│       ├── contacts/
│       ├── accounts/
│       ├── opportunities/
│       ├── tasks/
│       ├── cs/              # CS endpoints
│       ├── marketing/       # Marketing endpoints
│       ├── ai/              # AI chat endpoint
│       ├── mcp/             # MCP server
│       └── voice/           # Voice transcription
├── components/
│   ├── dashboard/           # Dashboard widgets
│   ├── forms/               # Entity forms
│   ├── layout/              # Sidebar, Header
│   ├── voice/               # Voice input
│   └── ui/                  # Shadcn components
├── lib/
│   ├── ai/                  # AI agent & tools
│   ├── mcp/                 # MCP implementation
│   ├── voice/               # Voice transcription
│   ├── workspace/           # Workspace logic
│   └── validation/          # Zod schemas
├── prisma/
│   └── schema.prisma        # Database schema
└── docs/
    ├── API.md               # REST API docs
    ├── MCP.md               # MCP documentation
    └── USER_GUIDE.md        # User guide
```

---

## 🤖 AI Integration

### AI Assistant

The AI Assistant can perform any CRM action via natural language:

```
"Create a lead for John Smith at Acme Corp"
"Show me all high-priority tickets"
"What's the health score for TechStart Inc?"
"Create a follow-up task for tomorrow"
```

### MCP Server

External AI agents can connect via MCP:

```bash
# SSE Connection
GET /api/mcp/sse?token=<api_key>

# JSON-RPC Messages
POST /api/mcp
X-Session-ID: <session_id>
X-API-Key: <api_key>
```

### Available AI Tools (44 total)

**Sales:** createLead, searchLeads, updateLead, createContact, searchContacts, createAccount, searchAccounts, createOpportunity, searchOpportunities, createNote, getDashboardStats

**CS:** createTicket, searchTickets, updateTicket, addTicketMessage, getHealthScore, searchAtRiskAccounts, searchPlaybooks, runPlaybook

**Marketing:** createCampaign, searchCampaigns, createSegment, searchSegments, createForm, searchForms

**Tasks:** createTask, completeTask, searchTasks

**Custom:** createCustomModule, createCustomField, createCustomModuleRecord, searchCustomModuleRecords, listCustomModules

**Documents:** searchDocuments, getDocumentStats, analyzeDocument

**Integrations:** getConnectedIntegrations, sendEmail, createCalendarEvent, sendSlackMessage, createGitHubIssue, executeExternalTool

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

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Yes | Clerk public key |
| `CLERK_SECRET_KEY` | Yes | Clerk secret key |
| `GOOGLE_GENERATIVE_AI_API_KEY` | Yes | Gemini API key |
| `OPENAI_API_KEY` | Yes | OpenAI key (for Whisper) |
| `REDIS_URL` | Yes | Redis connection string |
| `R2_ENDPOINT` | No | Cloudflare R2 endpoint |
| `R2_ACCESS_KEY_ID` | No | R2 access key |
| `R2_SECRET_ACCESS_KEY` | No | R2 secret key |
| `R2_BUCKET_NAME` | No | R2 bucket name |
| `COMPOSIO_API_KEY` | No | Composio integrations |
| `NEXT_PUBLIC_APP_URL` | No | App URL (default: localhost:3000) |

---

## 📊 Database Schema

### Core Entities
- **Organization** - Multi-tenant support
- **Lead** - Sales leads with pipeline stages
- **Contact** - Individual people
- **Account** - Companies/organizations
- **Opportunity** - Deals with value tracking
- **Task** - Cross-module tasks
- **Note** - Contextual notes
- **Activity** - Timeline events
- **Document** - File attachments

### Customer Success
- **Ticket** - Support tickets
- **TicketMessage** - Ticket replies
- **AccountHealth** - Health scores
- **Playbook** - Automation workflows
- **PlaybookRun** - Execution records

### Marketing
- **Campaign** - Marketing campaigns
- **Segment** - Audience segments
- **Form** - Lead capture forms
- **FormSubmission** - Form responses

### Configuration
- **PipelineStage** - Custom pipeline stages
- **CustomFieldDefinition** - Dynamic fields
- **CustomModule** - User-defined modules
- **DashboardConfig** - Widget layouts

### System
- **AuditLog** - Complete audit trail

---

## 🚀 Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Connect to Vercel
3. Add environment variables
4. Deploy

### Railway

1. Create PostgreSQL + Redis services
2. Deploy from GitHub
3. Add environment variables

---

## 📄 Documentation

- [API Documentation](docs/API.md)
- [MCP Integration](docs/MCP.md)
- [User Guide](docs/USER_GUIDE.md)

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

- [Next.js](https://nextjs.org/)
- [Clerk](https://clerk.com/)
- [Prisma](https://prisma.io/)
- [Shadcn UI](https://ui.shadcn.com/)
- [Vercel AI SDK](https://sdk.vercel.ai/)
- [Google Gemini](https://ai.google.dev/)
- [OpenAI Whisper](https://openai.com/research/whisper)
