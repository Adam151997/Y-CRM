# Y-CRM — AI-Powered CRM for SMBs

A comprehensive, AI-native Customer Relationship Management platform with voice commands, intelligent assistants, full invoicing, custom modules, real-time notifications, and multi-workspace architecture for Sales, Customer Success, and Marketing teams.

![Y CRM](https://img.shields.io/badge/version-2.1.0-blue.svg)
![Next.js](https://img.shields.io/badge/Next.js-14-black.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue.svg)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

---

## 🌟 Highlights

| Feature | Description |
|---------|-------------|
| **AI-Native** | Built-in AI assistant with 47+ tools for natural language CRM operations |
| **Voice Commands** | Whisper-powered voice input for hands-free data entry |
| **Full Invoicing** | Complete invoice lifecycle with PDF generation & payment tracking |
| **Custom Modules** | Create unlimited custom entities with relationship support |
| **RBAC Permissions** | Granular role-based access control with 4 default roles |
| **Multi-Workspace** | Dedicated workspaces for Sales, CS, and Marketing teams |
| **Custom Fields** | Extend any module with 13+ field types including relationships |
| **Team Assignment** | Assign records to team members with searchable selector |
| **MCP Integration** | Model Context Protocol server with API key authentication |
| **Real-time Notifications** | SSE-powered instant notifications across the platform |
| **Secure by Default** | AES-256-GCM encryption for tokens & API key authentication |
| **Reports & Analytics** | 13+ chart types with export capabilities |

---

## 📋 Table of Contents

- [Quick Start](#-quick-start)
- [Architecture](#-architecture)
- [Features](#-complete-feature-list)
- [Modules](#-modules-in-detail)
- [Custom Fields & Modules](#-custom-fields--modules)
- [Invoicing System](#-invoicing-system)
- [RBAC Permissions](#-rbac-permissions)
- [AI Integration](#-ai-integration)
- [MCP Server & API Keys](#-mcp-server--api-keys)
- [Real-time Notifications](#-real-time-notifications)
- [Reports & Analytics](#-reports--analytics)
- [Public Forms](#-public-forms)
- [Security & Encryption](#-security--encryption)
- [Integrations](#-integrations)
- [Database Schema](#-database-schema)
- [API Reference](#-api-reference)
- [Performance & Scalability](#-performance--scalability)
- [Project Structure](#-project-structure)
- [Environment Variables](#-environment-variables)
- [Deployment](#-deployment)

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL 14+ (Railway recommended)
- Redis (Railway recommended)
- Clerk account (with Organizations enabled)
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

# Generate encryption key
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
# Add the output to ENCRYPTION_KEY in .env.local

# Push database schema & run migrations
npx prisma migrate deploy

# Generate Prisma client
npm run db:generate

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

> **Note:** Default roles (Admin, Manager, Rep, Read Only) are automatically created when a new organization is set up.

---

## 🏗️ Architecture

### Three-Workspace Design

```
┌─────────────────────────────────────────────────────────────┐
│                         Y-CRM                                │
├─────────────────┬─────────────────┬─────────────────────────┤
│     SALES       │      CS         │       MARKETING         │
├─────────────────┼─────────────────┼─────────────────────────┤
│ • Leads         │ • Tickets       │ • Campaigns             │
│ • Contacts      │ • Health Scores │ • Segments              │
│ • Accounts      │ • Playbooks     │ • Forms                 │
│ • Opportunities │ • Renewals      │ • Public Forms          │
│ • Invoices      │ • At-Risk       │ • Analytics             │
│ • Pipeline      │ • CS Accounts   │                         │
│ • Tasks         │ • CS Tasks      │                         │
│ • Reports       │ • CSAT          │                         │
└─────────────────┴─────────────────┴─────────────────────────┘
```

### Tech Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Framework** | Next.js 14 (App Router) | Full-stack React framework |
| **Language** | TypeScript 5.6 | Type safety |
| **Database** | PostgreSQL + Prisma ORM | Data persistence |
| **Auth** | Clerk (Organizations) | Multi-tenant authentication |
| **AI/LLM** | Google Gemini 2.0 | AI assistant brain |
| **Voice** | OpenAI Whisper | Voice transcription |
| **UI** | Shadcn UI + Tailwind CSS | Component library |
| **State** | React Query + Zustand | Client state management |
| **Caching** | Redis | Rate limiting & caching |
| **Validation** | Zod | Schema validation |
| **Storage** | Vercel Blob / Cloudflare R2 | File storage |
| **Encryption** | AES-256-GCM | Token & secret encryption |
| **Real-time** | Server-Sent Events (SSE) | Live notifications |

---

## ✅ Complete Feature List

### Sales Module (100% Complete)

| Feature | Status | Description |
|---------|--------|-------------|
| Leads Management | ✅ | Full CRUD, status tracking, conversion, pipeline stages |
| Contacts | ✅ | Individual people with account linking |
| Accounts | ✅ | Companies with health tracking & financials |
| Opportunities | ✅ | Deals with pipeline, value, probability |
| Pipeline View | ✅ | Kanban board with drag-and-drop |
| **Invoicing** | ✅ | Full invoice lifecycle, PDF generation, payments |
| Tasks | ✅ | Cross-module task management |
| Notes | ✅ | Contextual notes on any entity |
| Activities | ✅ | Complete timeline across modules |
| Documents | ✅ | File upload, storage, viewer |
| Reports | ✅ | 13+ chart types, export to CSV |

### Customer Success Module (100% Complete)

| Feature | Status | Description |
|---------|--------|-------------|
| Support Tickets | ✅ | Full ticketing with priorities, categories, SLA |
| Internal Notes | ✅ | Private notes separate from customer messages |
| CSAT Surveys | ✅ | Customer satisfaction tracking |
| Health Scores | ✅ | 5-component automated scoring system |
| Playbooks | ✅ | Automated CS workflows with triggers |
| Renewals | ✅ | Contract renewal tracking & forecasting |
| At-Risk Alerts | ✅ | Proactive churn prevention |
| CS Accounts | ✅ | Customer-focused account views |
| CS Tasks | ✅ | Workspace-specific task management |
| CS AI Assistant | ✅ | Dedicated AI for customer success |

### Marketing Module (100% Complete)

| Feature | Status | Description |
|---------|--------|-------------|
| Campaigns | ✅ | Multi-channel campaign management |
| Segments | ✅ | Dynamic audience segmentation with rules |
| Segment Calculator | ✅ | Automatic member calculation engine |
| Forms | ✅ | Lead capture form builder |
| Public Forms | ✅ | Embeddable forms at `/f/[slug]` |
| Form Analytics | ✅ | Views, submissions, conversion rate |
| Marketing Assistant | ✅ | Dedicated AI for marketing |

### Platform Features (100% Complete)

| Feature | Status | Description |
|---------|--------|-------------|
| Custom Fields | ✅ | 13+ field types on all modules |
| Custom Modules | ✅ | Create unlimited custom entities |
| Relationship Fields | ✅ | Link records across modules |
| Team Assignment | ✅ | Assign records to team members |
| RBAC Permissions | ✅ | Role-based access control |
| Dynamic Dashboards | ✅ | 14 customizable widgets |
| AI Assistant | ✅ | Natural language CRM commands |
| Voice Input | ✅ | Whisper-powered transcription |
| MCP Server | ✅ | External AI agent integration |
| API Key Auth | ✅ | Scoped API keys for MCP access |
| Token Encryption | ✅ | AES-256-GCM for OAuth tokens |
| Omni-Search | ✅ | Cross-entity search (Cmd+K) |
| Audit Logging | ✅ | Complete activity trail |
| Real-time Notifications | ✅ | SSE-powered instant updates |
| Data Import/Export | ✅ | CSV import and bulk export |
| Workspace Switcher | ✅ | Quick navigation between workspaces |

---

## 📦 Modules in Detail

### Leads

Full lead management with pipeline visualization.

**Fields:** firstName, lastName, email, phone, company, title, source, status, pipelineStage, assignedTo, customFields

**Statuses:** NEW → CONTACTED → QUALIFIED → CONVERTED / LOST

**Features:**
- Pipeline kanban view with drag-and-drop
- Lead conversion to Contact + Account + Opportunity
- Activity timeline
- Task assignment
- Notes & documents

### Contacts

Individual person management linked to accounts.

**Fields:** firstName, lastName, email, phone, title, department, accountId, isPrimary, assignedTo, customFields

**Features:**
- Link to parent Account
- Mark as primary contact
- Activity timeline
- Direct ticket creation
- Invoice association

### Accounts

Company/organization management with health scoring.

**Fields:** name, industry, website, phone, address, annualRevenue, employeeCount, type, rating, assignedTo, customFields

**Types:** PROSPECT, CUSTOMER, PARTNER, VENDOR

**Features:**
- Related contacts list
- Related opportunities
- Health score tracking (automated)
- Invoice history
- Renewal tracking
- Support tickets
- Document storage

### Opportunities

Deal tracking with sales pipeline.

**Fields:** name, value, currency, probability, accountId, stageId, expectedCloseDate, closedWon, lostReason, assignedTo, customFields

**Currencies:** 16 supported (USD, EUR, GBP, AED, EGP, SAR, etc.)

**Features:**
- Pipeline stage progression
- Win/loss tracking with reasons
- Revenue forecasting
- Related invoices
- Auto-close on stage change

---

## 💰 Invoicing System

Complete invoice management with payment tracking.

### Invoice Lifecycle

```
DRAFT → SENT → VIEWED → PAID
                  ↓
            PARTIALLY_PAID
                  ↓
              OVERDUE
                  ↓
         CANCELLED / VOID
```

### Features

| Feature | Description |
|---------|-------------|
| **Auto-Numbering** | Sequential invoice numbers (INV-0001, INV-0002) |
| **Line Items** | Unlimited items with quantity, unit price, description |
| **Tax Calculation** | Percentage-based tax with automatic calculation |
| **Discounts** | Fixed amount or percentage discounts |
| **Payment Tracking** | Record multiple payments against single invoice |
| **PDF Generation** | Professional PDF export with company branding |
| **Bulk Export** | Export multiple invoices as ZIP |
| **Duplication** | Clone existing invoices |
| **16 Currencies** | Multi-currency support |
| **Due Date Alerts** | Automatic overdue status |

### Invoice Fields

```typescript
{
  invoiceNumber: "INV-0001",
  status: "DRAFT" | "SENT" | "VIEWED" | "PAID" | "PARTIALLY_PAID" | "OVERDUE" | "CANCELLED" | "VOID",
  accountId: string,
  contactId?: string,
  opportunityId?: string,
  issueDate: Date,
  dueDate: Date,
  currency: "USD" | "EUR" | "GBP" | ... (16 total),
  subtotal: Decimal,
  taxRate?: Decimal,
  taxAmount: Decimal,
  discountType?: "PERCENTAGE" | "FIXED",
  discountValue?: Decimal,
  discountAmount: Decimal,
  total: Decimal,
  amountPaid: Decimal,
  amountDue: Decimal,
  notes?: string,
  terms?: string,
  items: InvoiceItem[]
}
```

### Payment Methods

CASH, CHECK, CREDIT_CARD, DEBIT_CARD, BANK_TRANSFER, PAYPAL, STRIPE, OTHER

---

## 🔧 Custom Fields & Modules

### Custom Fields

Extend any built-in module with custom fields.

**Supported Field Types (13):**

| Type | Description | Validation |
|------|-------------|------------|
| `TEXT` | Single-line text | Max 1000 chars |
| `TEXTAREA` | Multi-line text | Max 5000 chars |
| `NUMBER` | Numeric value | Number type |
| `CURRENCY` | Money value | Number + currency display |
| `PERCENT` | Percentage | 0-100 range |
| `DATE` | Date picker | Valid date |
| `BOOLEAN` | Checkbox | true/false |
| `SELECT` | Dropdown | Options list |
| `MULTISELECT` | Multi-select tags | Options list |
| `EMAIL` | Email address | Email format |
| `PHONE` | Phone number | Max 30 chars |
| `URL` | Web link | Valid URL |
| `RELATIONSHIP` | Link to another record | Valid UUID + exists check |
| `FILE` | File attachment | Vercel Blob storage |

**Custom Field Definition:**

```typescript
{
  fieldName: "Industry",        // Display name
  fieldKey: "industry",         // JSON key
  fieldType: "SELECT",          // Field type
  required: false,
  options: ["Technology", "Finance", "Healthcare"],
  placeholder: "Select industry...",
  helpText: "Primary business sector",
  displayOrder: 1,
  relatedModule?: "accounts"    // For RELATIONSHIP type
}
```

### Custom Modules

Create entirely new CRM entities beyond standard modules.

**Features:**
- Define custom fields
- Relationship links to any module
- List & detail views auto-generated
- Full CRUD operations
- Search & filtering
- Assignee support
- Audit logging

**Custom Module Structure:**

```typescript
{
  name: "Products",
  pluralName: "Products",
  slug: "products",
  icon: "box",              // Lucide icon name
  color: "#FF5757",
  labelField: "name",       // Field used as record title
  showInSidebar: true,
  fields: CustomFieldDefinition[]
}
```

### Relationship System

Link records across modules with validated relationships.

**Capabilities:**
- ✅ Link to built-in modules (Lead, Contact, Account, Opportunity)
- ✅ Link to custom modules
- ✅ Validation (target record must exist)
- ✅ Referential integrity (cleanup on delete)
- ✅ Multi-level traversal (Account → Products → Warranties)
- ✅ Reverse lookup (find all records linking to X)

---

## 🔐 RBAC Permissions

### Default Roles

| Role | Permissions | Auto-Assign |
|------|-------------|-------------|
| **Admin** | Full access to all modules and settings | Organization creator |
| **Manager** | Full access to all modules (no settings) | — |
| **Rep** | View, Create, Edit (no Delete) | New members |
| **Read Only** | View only | — |

### Permission Matrix

| Module | View | Create | Edit | Delete |
|--------|------|--------|------|--------|
| leads | ✓ | ✓ | ✓ | ✓ |
| contacts | ✓ | ✓ | ✓ | ✓ |
| accounts | ✓ | ✓ | ✓ | ✓ |
| opportunities | ✓ | ✓ | ✓ | ✓ |
| invoices | ✓ | ✓ | ✓ | ✓ |
| tasks | ✓ | ✓ | ✓ | ✓ |
| documents | ✓ | ✓ | ✓ | ✓ |
| tickets | ✓ | ✓ | ✓ | ✓ |
| campaigns | ✓ | ✓ | ✓ | ✓ |
| settings | ✓ | ✓ | ✓ | ✓ |
| *custom modules* | ✓ | ✓ | ✓ | ✓ |

### Using Permissions

**API Routes:**

```typescript
import { checkRoutePermission } from "@/lib/api-permissions";

export async function DELETE(req: Request) {
  const auth = await getApiAuthContext();
  const error = await checkRoutePermission(auth.userId, auth.orgId, "leads", "delete");
  if (error) return error; // Returns 403 Forbidden
  // ... proceed with delete
}
```

**UI Components:**

```tsx
import { CanAccess } from "@/components/can-access";

// Hide delete button if user lacks permission
<CanAccess module="leads" action="delete">
  <DeleteButton />
</CanAccess>

// Show alternative content
<CanAccess module="settings" action="edit" fallback={<UpgradePrompt />}>
  <SettingsForm />
</CanAccess>
```

**Hooks:**

```typescript
import { usePermissions } from "@/hooks/use-permissions";

function MyComponent() {
  const { can, isLoading } = usePermissions();
  
  if (can("leads", "delete")) {
    // User can delete leads
  }
}
```

---

## 🤖 AI Integration

### AI Assistant

Natural language interface to CRM operations with workspace-specific assistants.

**Example Commands:**

```
"Create a lead for John Smith at Acme Corp"
"Show me all high-priority tickets"
"What's the health score for TechStart Inc?"
"Find all opportunities closing this month over $50k"
"Create a follow-up task for tomorrow"
"Send invoice INV-0042 to the client"
"Calculate segment members for Enterprise Customers"
```

### AI Tools (47+ Total)

**Sales Tools (11):**
- createLead, searchLeads, updateLead, deleteLead
- createContact, searchContacts
- createAccount, searchAccounts
- createOpportunity, searchOpportunities
- createNote

**Invoicing Tools (4):**
- createInvoice, searchInvoices, updateInvoiceStatus, recordPayment

**CS Tools (12):**
- createTicket, searchTickets, updateTicket, addTicketMessage
- getHealthScore, searchAtRiskAccounts, calculateHealthScore
- searchPlaybooks, runPlaybook
- createRenewal, searchRenewals, getUpcomingRenewals

**Marketing Tools (6):**
- createCampaign, searchCampaigns
- createSegment, searchSegments, calculateSegmentMembers
- createForm, searchForms

**Task Tools (4):**
- createTask, completeTask, searchTasks, updateTask

**Custom Module Tools (5):**
- createCustomModule, createCustomField
- createCustomModuleRecord, searchCustomModuleRecords
- listCustomModules

**Document Tools (3):**
- searchDocuments, getDocumentStats, analyzeDocument

**Integration Tools (8):**
- getConnectedIntegrations
- sendEmail, searchEmails (Gmail)
- createCalendarEvent, getUpcomingEvents, getTodayEvents (Google Calendar)
- sendSlackMessage, listSlackChannels (Slack)

**Utility Tools (2):**
- getDashboardStats, semanticSearch

---

## 🔌 MCP Server & API Keys

### MCP Server

External AI agents (Claude Desktop, Cursor, custom agents) can connect via Model Context Protocol.

**Internal Tools Exposed (17):**
- create_lead, search_leads
- create_contact, create_account
- create_opportunity, create_task
- create_ticket, search_tickets
- get_health_score, search_playbooks
- create_campaign, search_campaigns
- create_segment, create_form
- list_custom_modules, create_custom_module
- get_dashboard

### API Key Authentication

Create scoped API keys for secure MCP access.

**Key Format:** `ycrm_[24 random chars]`  
**Example:** `ycrm_jzZLiFi4g6PFF4RbdoZAP0b2sExyzK6H`

**Scopes:**
| Scope | Description |
|-------|-------------|
| `mcp:read` | Read CRM data via MCP tools |
| `mcp:write` | Create and update records |
| `mcp:admin` | Full access including destructive operations |

### Managing API Keys

Navigate to **Settings → AI Tools → API Keys** to:
- Create new API keys with custom scopes
- View usage statistics (last used, request count)
- Revoke or delete keys
- Set expiration dates

### Connecting External Clients

**SSE Connection:**

```bash
# Connect via SSE
curl "https://your-domain.com/api/mcp/sse?token=ycrm_your_key_here"

# Response:
event: session
data: {"sessionId":"uuid-here"}
```

**JSON-RPC Messages:**

```bash
curl -X POST "https://your-domain.com/api/mcp" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: ycrm_your_key_here" \
  -H "X-Session-ID: uuid-from-sse" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

**Claude Desktop Configuration:**

```json
{
  "mcpServers": {
    "y-crm": {
      "url": "https://your-domain.com/api/mcp/sse?token=ycrm_your_key_here"
    }
  }
}
```

---

## 🔔 Real-time Notifications

### SSE-Powered Notifications

Y-CRM uses Server-Sent Events for instant, real-time notifications.

**Notification Types:**
- `LEAD_CREATED` - New lead captured
- `TASK_ASSIGNED` - Task assigned to user
- `TASK_COMPLETED` - Task marked complete
- `OPPORTUNITY_WON` - Deal closed won
- `TICKET_CREATED` - New support ticket
- `TICKET_RESOLVED` - Ticket resolved
- `HEALTH_ALERT` - Account health dropped

### Architecture

```
┌─────────────┐     SSE Stream      ┌─────────────────┐
│   Browser   │◄────────────────────│  /api/notifications/stream  │
└─────────────┘                     └─────────────────┘
       ▲                                    ▲
       │                                    │
       │ Optimistic UI                      │ Push
       │                                    │
┌─────────────┐                     ┌─────────────────┐
│ Notification│                     │  lib/notifications.ts  │
│  Provider   │                     └─────────────────┘
└─────────────┘
```

**Features:**
- Auto-reconnect with exponential backoff
- Fallback to polling (30-second intervals)
- Connection status indicator
- Mark as read (individual or bulk)
- Optimistic UI updates

### Usage

Notifications appear in the header dropdown. Click to mark as read or navigate to the related entity.

---

## 📊 Reports & Analytics

### Reports Dashboard

Access via `/reports` - comprehensive analytics across all modules.

**Available Charts (13):**

| Chart | Description |
|-------|-------------|
| Sales Overview | KPIs: revenue, deals, conversion rate |
| Pipeline Value | Value by stage visualization |
| Pipeline Funnel | Conversion funnel chart |
| Leads by Status | Status distribution pie chart |
| Leads by Source | Source attribution |
| Lead Conversion Funnel | Lead-to-customer journey |
| Opportunities by Stage | Stage distribution |
| Win Rate Trend | Historical win rate line chart |
| Sales Velocity | Average deal cycle time |
| Invoice Analytics | Revenue, outstanding, overdue |
| Recent Activity | Activity feed |

### Filters

- **Date Range:** Last 7 days, 30 days, 90 days, custom
- **Pipeline:** Filter by specific pipeline
- **Assignee:** Filter by team member

### Export

Export report data to CSV for external analysis.

---

## 🌐 Public Forms

### Lead Capture Forms

Create embeddable forms for lead generation.

**Features:**
- Drag-and-drop form builder
- 10+ field types
- Custom styling options
- Redirect after submission
- Email notifications
- Auto-create leads
- Conversion tracking

### Public URLs

Forms are accessible at: `https://your-domain.com/f/[form-slug]`

**Embed Example:**

```html
<iframe 
  src="https://your-domain.com/f/contact-us"
  width="100%"
  height="600"
  frameborder="0">
</iframe>
```

### Form Analytics

Track form performance:
- **Views:** Total page views
- **Submissions:** Completed submissions
- **Conversion Rate:** Submissions / Views

---

## 🔒 Security & Encryption

### Token Encryption

All OAuth tokens and sensitive data are encrypted at rest using AES-256-GCM.

**Encrypted Data:**
- Google OAuth access & refresh tokens
- Slack OAuth tokens
- MCP integration auth configs
- MCP integration environment variables

**Implementation:**

```typescript
import { encrypt, decrypt } from "@/lib/encryption";

// Encrypt sensitive data
const encrypted = encrypt(accessToken);

// Decrypt when needed
const decrypted = decrypt(encrypted);
```

### API Key Security

- Keys are never stored - only SHA-256 hashes
- Key prefix stored for identification (`ycrm_abc123...`)
- Scoped permissions (read/write/admin)
- Usage tracking (last used, request count)
- Expiration support
- Revocation capability

### Token Migration

For existing deployments, run the migration script:

```bash
npx ts-node scripts/migrate-tokens.ts
```

This encrypts any legacy unencrypted tokens.

---

## 🔗 Integrations

### Built-in Integrations

| Integration | Features |
|-------------|----------|
| **Google Gmail** | Send emails, search inbox |
| **Google Calendar** | Create events, view schedule |
| **Google Drive** | File access |
| **Slack** | Send messages, list channels |

### OAuth Flow

1. Navigate to **Settings → Integrations**
2. Click "Connect" for desired integration
3. Complete OAuth authorization
4. Integration is now available to AI assistant

### Composio (External Tools)

Y-CRM supports Composio for additional integrations:
- GitHub
- Notion
- Jira
- And more...

---

## 💾 Database Schema

### Entity Relationship Diagram

```
Organization (tenant)
├── Role ←→ Permission
├── UserRole
├── Lead ──┬── Note, Task, Activity, Document
│          └── PipelineStage
├── Contact ──┬── Note, Task, Activity
│             └── Account (FK)
├── Account ──┬── Note, Task, Activity, Document
│             ├── Contact[]
│             ├── Opportunity[]
│             ├── Invoice[]
│             ├── Ticket[]
│             ├── AccountHealth
│             └── Renewal[]
├── Opportunity ──┬── Note, Task
│                 ├── Account (FK)
│                 ├── PipelineStage (FK)
│                 └── Invoice[]
├── Invoice ──┬── InvoiceItem[]
│             └── Payment[]
├── Ticket ────── TicketMessage[]
├── Playbook ──── PlaybookRun[]
├── Campaign ──── Segment (FK)
├── Segment ───── SegmentMember[]
├── Form ──────── FormSubmission[]
├── CustomModule ──┬── CustomFieldDefinition[]
│                  └── CustomModuleRecord[]
├── CustomFieldDefinition (for built-in modules)
├── DashboardConfig
├── Notification
├── AuditLog
├── Integration
├── MCPIntegration
├── APIKey
└── UsageRecord
```

### Key Tables

| Table | Purpose |
|-------|---------|
| Organization | Multi-tenant root |
| Lead, Contact, Account, Opportunity | Core CRM entities |
| Invoice, InvoiceItem, Payment | Billing system |
| Ticket, TicketMessage | Support ticketing |
| AccountHealth | Health scoring |
| Playbook, PlaybookRun | CS automation |
| Renewal | Contract tracking |
| Campaign, Segment, SegmentMember | Marketing |
| Form, FormSubmission | Lead capture |
| CustomModule, CustomModuleRecord | Extensibility |
| CustomFieldDefinition | Dynamic fields |
| Notification | Real-time alerts |
| Integration | OAuth connections |
| MCPIntegration | External MCP servers |
| APIKey | MCP authentication |
| AuditLog | Compliance trail |
| Role, Permission, UserRole | RBAC |

---

## 📡 API Reference

### Authentication

All API routes require Clerk authentication. Organization context is determined by the user's active organization.

MCP endpoints accept API key authentication via `X-API-Key` header.

### Core Endpoints

**Leads:**
```
GET    /api/leads              # List leads
POST   /api/leads              # Create lead
GET    /api/leads/:id          # Get lead
PUT    /api/leads/:id          # Update lead
DELETE /api/leads/:id          # Delete lead
```

**Contacts:**
```
GET    /api/contacts           # List contacts
POST   /api/contacts           # Create contact
GET    /api/contacts/:id       # Get contact
PUT    /api/contacts/:id       # Update contact
DELETE /api/contacts/:id       # Delete contact
```

**Accounts:**
```
GET    /api/accounts           # List accounts
POST   /api/accounts           # Create account
GET    /api/accounts/:id       # Get account
PUT    /api/accounts/:id       # Update account
DELETE /api/accounts/:id       # Delete account
```

**Opportunities:**
```
GET    /api/opportunities      # List opportunities
POST   /api/opportunities      # Create opportunity
GET    /api/opportunities/:id  # Get opportunity
PUT    /api/opportunities/:id  # Update opportunity
DELETE /api/opportunities/:id  # Delete opportunity
```

**Invoices:**
```
GET    /api/invoices                    # List invoices
POST   /api/invoices                    # Create invoice
GET    /api/invoices/:id                # Get invoice
PUT    /api/invoices/:id                # Update invoice
DELETE /api/invoices/:id                # Delete invoice
POST   /api/invoices/:id/send           # Mark as sent
POST   /api/invoices/:id/payments       # Record payment
GET    /api/invoices/:id/pdf            # Generate PDF
POST   /api/invoices/:id/duplicate      # Duplicate invoice
POST   /api/invoices/bulk-export        # Bulk PDF export
```

**Tasks:**
```
GET    /api/tasks              # List tasks
POST   /api/tasks              # Create task
GET    /api/tasks/:id          # Get task
PUT    /api/tasks/:id          # Update task
DELETE /api/tasks/:id          # Delete task
```

**Customer Success:**
```
GET    /api/cs/tickets                     # List tickets
POST   /api/cs/tickets                     # Create ticket
GET    /api/cs/tickets/:id                 # Get ticket
PUT    /api/cs/tickets/:id                 # Update ticket
POST   /api/cs/tickets/:id/messages        # Add message
GET    /api/cs/health                      # List health scores
GET    /api/cs/health/:accountId           # Get health score
POST   /api/cs/health/:accountId           # Calculate health
POST   /api/cs/health/recalculate          # Recalculate all
GET    /api/cs/playbooks                   # List playbooks
POST   /api/cs/playbooks                   # Create playbook
POST   /api/cs/playbooks/:id/run           # Run playbook
GET    /api/cs/renewals                    # List renewals
POST   /api/cs/renewals                    # Create renewal
PUT    /api/cs/renewals/:id                # Update renewal
```

**Marketing:**
```
GET    /api/marketing/campaigns            # List campaigns
POST   /api/marketing/campaigns            # Create campaign
GET    /api/marketing/campaigns/:id        # Get campaign
PUT    /api/marketing/campaigns/:id        # Update campaign
GET    /api/marketing/segments             # List segments
POST   /api/marketing/segments             # Create segment
GET    /api/marketing/segments/:id         # Get segment
PUT    /api/marketing/segments/:id         # Update segment
GET    /api/marketing/segments/fields      # Available fields
POST   /api/marketing/segments/preview     # Preview members
POST   /api/marketing/segments/:id/calculate  # Calculate members
GET    /api/marketing/segments/:id/members    # List members
GET    /api/marketing/forms                # List forms
POST   /api/marketing/forms                # Create form
GET    /api/marketing/forms/:id            # Get form
PUT    /api/marketing/forms/:id            # Update form
```

**Public Forms:**
```
GET    /api/public/forms/:slug             # Get form (public)
POST   /api/public/forms/:slug/submit      # Submit form (public)
```

**API Keys:**
```
GET    /api/api-keys           # List API keys
POST   /api/api-keys           # Create API key
GET    /api/api-keys/:id       # Get API key
PUT    /api/api-keys/:id       # Update API key
DELETE /api/api-keys/:id       # Delete API key
PATCH  /api/api-keys/:id       # Revoke API key
```

**MCP Server:**
```
GET    /api/mcp                # Server info
POST   /api/mcp                # JSON-RPC messages
GET    /api/mcp/sse            # SSE connection
GET    /api/mcp/integrations   # List MCP servers
POST   /api/mcp/integrations   # Add MCP server
PUT    /api/mcp/integrations/:id          # Update server
DELETE /api/mcp/integrations/:id          # Delete server
POST   /api/mcp/integrations/:id/connect  # Connect
DELETE /api/mcp/integrations/:id/connect  # Disconnect
GET    /api/mcp/integrations/:id/tools    # List tools
```

**Notifications:**
```
GET    /api/notifications          # List notifications
POST   /api/notifications          # Create notification
GET    /api/notifications/stream   # SSE stream
PATCH  /api/notifications/:id      # Mark as read
```

**Reports:**
```
GET    /api/reports/stats          # Get statistics
POST   /api/reports/export         # Export to CSV
```

**Custom Modules:**
```
GET    /api/custom-modules              # List modules
POST   /api/custom-modules              # Create module
GET    /api/custom-modules/:id          # Get module
PUT    /api/custom-modules/:id          # Update module
DELETE /api/custom-modules/:id          # Delete module
GET    /api/modules/:slug/records       # List records
POST   /api/modules/:slug/records       # Create record
GET    /api/modules/:slug/records/:id   # Get record
PUT    /api/modules/:slug/records/:id   # Update record
DELETE /api/modules/:slug/records/:id   # Delete record
```

**Settings:**
```
GET    /api/settings/custom-fields      # List custom fields
POST   /api/settings/custom-fields      # Create custom field
PUT    /api/settings/custom-fields/:id  # Update custom field
DELETE /api/settings/custom-fields/:id  # Delete custom field
GET    /api/settings/pipeline-stages    # List pipeline stages
POST   /api/settings/pipeline-stages    # Create stage
PUT    /api/settings/pipeline-stages/:id  # Update stage
DELETE /api/settings/pipeline-stages/:id  # Delete stage
```

**Other:**
```
GET    /api/search                 # Omni-search
GET    /api/lookup                 # Entity lookup
GET    /api/team                   # List team members
POST   /api/team/invite            # Invite member
GET    /api/roles                  # List roles
POST   /api/roles                  # Create role
GET    /api/permissions/me         # Get my permissions
GET    /api/audit-logs             # List audit logs
POST   /api/import                 # Import CSV
POST   /api/export                 # Export data
POST   /api/upload                 # Upload file
POST   /api/voice/transcribe       # Transcribe audio
POST   /api/ai/chat                # AI chat
GET    /api/dashboard/config       # Get dashboard config
PUT    /api/dashboard/config       # Save dashboard config
GET    /api/dashboard/widgets/:type  # Get widget data
GET    /api/integrations           # List integrations
POST   /api/integrations/:provider # Connect integration
DELETE /api/integrations/disconnect  # Disconnect
```

### Response Format

```json
{
  "data": { ... },
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

### Error Format

```json
{
  "error": "Validation failed",
  "details": {
    "email": "Invalid email format",
    "name": "Required"
  }
}
```

---

## ⚡ Performance & Scalability

### Database Optimizations

Y-CRM implements several performance optimizations for scale:

**GIN Indexes on JSON Fields:**
```sql
CREATE INDEX idx_custom_record_data_gin ON "CustomModuleRecord" USING gin("data" jsonb_path_ops);
CREATE INDEX idx_lead_custom_fields_gin ON "Lead" USING gin("customFields" jsonb_path_ops);
CREATE INDEX idx_contact_custom_fields_gin ON "Contact" USING gin("customFields" jsonb_path_ops);
CREATE INDEX idx_account_custom_fields_gin ON "Account" USING gin("customFields" jsonb_path_ops);
CREATE INDEX idx_opportunity_custom_fields_gin ON "Opportunity" USING gin("customFields" jsonb_path_ops);
```

**Composite Indexes:**
```sql
CREATE INDEX idx_custom_record_module_created ON "CustomModuleRecord" ("moduleId", "createdAt" DESC);
CREATE INDEX idx_custom_record_org_module ON "CustomModuleRecord" ("orgId", "moduleId");
```

### Caching

- **Search Cache:** 30-second TTL on search results
- **Field Definition Cache:** 5-minute TTL
- **Team Member Cache:** Singleton promise pattern for concurrent requests

### Performance Targets

| Dataset Size | Search Latency | List Latency |
|--------------|----------------|--------------|
| 1,000 records | < 50ms | < 100ms |
| 10,000 records | < 100ms | < 200ms |
| 50,000 records | < 500ms | < 500ms |

### Rate Limiting

Redis-based rate limiting protects API endpoints:

- **Standard endpoints:** 100 requests/minute
- **AI endpoints:** 20 requests/minute
- **Search endpoints:** 60 requests/minute

---

## 📁 Project Structure

```
y-crm/
├── app/
│   ├── (auth)/                    # Authentication pages
│   │   ├── sign-in/
│   │   └── sign-up/
│   ├── (dashboard)/               # Main application
│   │   ├── accounts/              # Accounts module
│   │   ├── contacts/              # Contacts module
│   │   ├── leads/                 # Leads module
│   │   ├── opportunities/         # Opportunities module
│   │   ├── pipeline/              # Pipeline kanban view
│   │   ├── reports/               # Reports & analytics
│   │   ├── tasks/                 # Tasks module
│   │   ├── documents/             # Documents
│   │   ├── assistant/             # AI Assistant
│   │   ├── dashboard/             # Main dashboard
│   │   ├── sales/                 # Sales workspace
│   │   │   ├── invoices/          # Invoicing module
│   │   │   ├── pipeline/
│   │   │   ├── reports/
│   │   │   └── assistant/
│   │   ├── cs/                    # Customer Success workspace
│   │   │   ├── tickets/
│   │   │   ├── health/
│   │   │   ├── playbooks/
│   │   │   ├── renewals/
│   │   │   ├── accounts/
│   │   │   ├── tasks/
│   │   │   └── assistant/
│   │   ├── marketing/             # Marketing workspace
│   │   │   ├── campaigns/
│   │   │   ├── segments/
│   │   │   ├── forms/
│   │   │   └── assistant/
│   │   ├── modules/               # Custom modules UI
│   │   └── settings/              # All settings
│   │       ├── custom-fields/
│   │       ├── modules/
│   │       ├── pipeline/
│   │       ├── roles/
│   │       ├── team/
│   │       ├── branding/
│   │       ├── data/
│   │       ├── integrations/
│   │       ├── ai-tools/          # MCP & API Keys
│   │       ├── activity/
│   │       └── organization/
│   ├── (public)/                  # Public pages
│   │   └── f/[slug]/              # Public forms
│   ├── api/                       # API routes
│   │   ├── accounts/
│   │   ├── api-keys/              # API key management
│   │   ├── contacts/
│   │   ├── leads/
│   │   ├── opportunities/
│   │   ├── invoices/
│   │   ├── tasks/
│   │   ├── notes/
│   │   ├── custom-modules/
│   │   ├── modules/[slug]/records/
│   │   ├── ai/
│   │   ├── mcp/                   # MCP server
│   │   │   ├── sse/
│   │   │   └── integrations/
│   │   ├── voice/
│   │   ├── search/
│   │   ├── team/
│   │   ├── roles/
│   │   ├── permissions/
│   │   ├── settings/
│   │   ├── cs/                    # Customer Success APIs
│   │   │   ├── tickets/
│   │   │   ├── health/
│   │   │   ├── playbooks/
│   │   │   └── renewals/
│   │   ├── marketing/             # Marketing APIs
│   │   │   ├── campaigns/
│   │   │   ├── segments/
│   │   │   └── forms/
│   │   ├── public/forms/          # Public form APIs
│   │   ├── notifications/         # Real-time notifications
│   │   ├── reports/               # Report APIs
│   │   ├── dashboard/
│   │   ├── integrations/          # OAuth integrations
│   │   ├── cron/                  # Scheduled jobs
│   │   └── ...
│   └── select-org/                # Organization selector
├── components/
│   ├── ui/                        # Shadcn components (30+)
│   ├── forms/                     # Entity forms
│   │   ├── custom-fields-renderer.tsx
│   │   ├── assignee-selector.tsx
│   │   └── relationship-field-input.tsx
│   ├── dashboard/                 # Dashboard widgets (14)
│   │   └── widgets/
│   ├── layout/                    # App shell
│   │   ├── notification-dropdown.tsx
│   │   ├── workspace-switcher.tsx
│   │   └── omni-search.tsx
│   ├── providers/                 # Context providers
│   │   ├── notification-provider.tsx
│   │   └── query-provider.tsx
│   ├── marketing/                 # Marketing components
│   │   └── public-form-renderer.tsx
│   ├── can-access.tsx             # Permission gate
│   └── voice/                     # Voice input
├── hooks/
│   ├── use-permissions.tsx
│   └── use-chat.ts
├── lib/
│   ├── ai/                        # AI agent & tools (47+)
│   ├── mcp/                       # MCP protocol implementation
│   │   ├── client/                # Connect to external servers
│   │   ├── server/                # Expose Y-CRM as server
│   │   ├── protocol/              # JSON-RPC types
│   │   └── registry/              # Tool registry
│   ├── integrations/              # OAuth integrations
│   │   ├── google/                # Gmail, Calendar, Drive
│   │   └── slack/                 # Slack
│   ├── composio/                  # Composio integration
│   ├── relationships/             # Relationship system
│   ├── validation/                # Zod schemas
│   ├── marketing/                 # Marketing utilities
│   │   ├── segment-calculator.ts
│   │   └── form-submission.ts
│   ├── invoices/                  # Invoice utilities
│   ├── dashboard/                 # Widget registry
│   ├── workspace/                 # Workspace system
│   ├── voice/                     # Voice transcription
│   ├── encryption.ts              # AES-256-GCM encryption
│   ├── api-keys.ts                # API key management
│   ├── notifications.ts           # Notification service
│   ├── health-calculator.ts       # Health score engine
│   ├── playbook-triggers.ts       # Playbook automation
│   ├── auth.ts
│   ├── db.ts
│   ├── audit.ts
│   ├── cache.ts
│   ├── permissions.ts
│   ├── api-permissions.ts
│   └── rate-limit.ts
├── prisma/
│   ├── schema.prisma              # Database schema (28 models)
│   └── migrations/
├── scripts/
│   ├── migrate-tokens.ts          # Token encryption migration
│   ├── mcp-server.ts              # Standalone MCP server
│   └── enable-pgvector.ts         # Vector extension
└── docs/
```

---

## 🔐 Environment Variables

### Required

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection | `postgresql://user:pass@host:5432/db` |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk public key | `pk_live_...` |
| `CLERK_SECRET_KEY` | Clerk secret key | `sk_live_...` |
| `GOOGLE_GENERATIVE_AI_API_KEY` | Gemini API key | `AIza...` |
| `OPENAI_API_KEY` | OpenAI key (Whisper) | `sk-...` |
| `REDIS_URL` | Redis connection | `redis://...` |
| `ENCRYPTION_KEY` | Token encryption key | Generate with script below |

**Generate Encryption Key:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### Optional - Integrations

| Variable | Description |
|----------|-------------|
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |
| `SLACK_CLIENT_ID` | Slack OAuth client ID |
| `SLACK_CLIENT_SECRET` | Slack OAuth client secret |
| `COMPOSIO_API_KEY` | Composio integrations |

### Optional - Storage

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_APP_URL` | Application URL |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob token |
| `R2_ENDPOINT` | Cloudflare R2 URL |
| `R2_ACCESS_KEY_ID` | R2 access key |
| `R2_SECRET_ACCESS_KEY` | R2 secret |
| `R2_BUCKET_NAME` | R2 bucket |

---

## 🚀 Deployment

### Vercel (Recommended)

1. Push repository to GitHub
2. Import project in Vercel Dashboard
3. Add environment variables (including `ENCRYPTION_KEY`)
4. Deploy

**Build Settings:**
- Framework: Next.js
- Build Command: `prisma generate && next build`
- Output Directory: `.next`

### Railway

1. Create PostgreSQL service
2. Create Redis service
3. Deploy from GitHub
4. Add environment variables
5. Run migrations: `npx prisma migrate deploy`

### Database Migrations

```bash
# Development: push schema directly
npm run db:push

# Production: create and apply migrations
npx prisma migrate dev --name your_migration_name
npx prisma migrate deploy
```

### Post-Deployment

**Migrate Legacy Tokens (if upgrading):**
```bash
npx ts-node scripts/migrate-tokens.ts
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
| `npx ts-node scripts/migrate-tokens.ts` | Encrypt legacy tokens |
| `npx ts-node scripts/mcp-server.ts` | Run standalone MCP server |
| `npx ts-node scripts/enable-pgvector.ts` | Enable vector extension |

---

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.

---

## 🙏 Acknowledgments

- [Next.js](https://nextjs.org/) — React framework
- [Clerk](https://clerk.com/) — Authentication
- [Prisma](https://prisma.io/) — Database ORM
- [Shadcn UI](https://ui.shadcn.com/) — UI components
- [Vercel AI SDK](https://sdk.vercel.ai/) — AI integration
- [Google Gemini](https://ai.google.dev/) — LLM provider
- [OpenAI Whisper](https://openai.com/research/whisper) — Voice transcription
- [Tailwind CSS](https://tailwindcss.com/) — Styling

---

<p align="center">
  <strong>Y-CRM</strong> — Built with ❤️ for SMBs
</p>
