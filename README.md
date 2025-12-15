# Y-CRM — AI-Powered CRM for SMBs

A comprehensive, AI-native Customer Relationship Management platform with voice commands, intelligent assistants, full invoicing, custom modules, and multi-workspace architecture for Sales, Customer Success, and Marketing teams.

![Y CRM](https://img.shields.io/badge/version-2.0.0-blue.svg)
![Next.js](https://img.shields.io/badge/Next.js-14-black.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue.svg)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

---

## 🌟 Highlights

| Feature | Description |
|---------|-------------|
| **AI-Native** | Built-in AI assistant with 44+ tools for natural language CRM operations |
| **Voice Commands** | Whisper-powered voice input for hands-free data entry |
| **Full Invoicing** | Complete invoice lifecycle with PDF generation & payment tracking |
| **Custom Modules** | Create unlimited custom entities with relationship support |
| **RBAC Permissions** | Granular role-based access control with 4 default roles |
| **Multi-Workspace** | Dedicated workspaces for Sales, CS, and Marketing teams |
| **Custom Fields** | Extend any module with 12+ field types including relationships |
| **Team Assignment** | Assign records to team members with searchable selector |
| **MCP Integration** | Model Context Protocol server for external AI agents |

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
│ • Opportunities │ • Renewals      │ • Analytics             │
│ • Invoices      │ • At-Risk       │                         │
│ • Pipeline      │                 │                         │
│ • Tasks         │                 │                         │
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

### Customer Success Module (100% Complete)

| Feature | Status | Description |
|---------|--------|-------------|
| Support Tickets | ✅ | Full ticketing with priorities, categories, SLA |
| Health Scores | ✅ | 5-component scoring system |
| Playbooks | ✅ | Automated CS workflows |
| Renewals | ✅ | Contract renewal tracking |
| At-Risk Alerts | ✅ | Proactive churn prevention |

### Marketing Module (100% Complete)

| Feature | Status | Description |
|---------|--------|-------------|
| Campaigns | ✅ | Multi-channel campaign management |
| Segments | ✅ | Dynamic audience segmentation |
| Forms | ✅ | Lead capture form builder |

### Platform Features (100% Complete)

| Feature | Status | Description |
|---------|--------|-------------|
| Custom Fields | ✅ | 12+ field types on all modules |
| Custom Modules | ✅ | Create unlimited custom entities |
| Relationship Fields | ✅ | Link records across modules |
| Team Assignment | ✅ | Assign records to team members |
| RBAC Permissions | ✅ | Role-based access control |
| Dynamic Dashboards | ✅ | 15+ customizable widgets |
| AI Assistant | ✅ | Natural language CRM commands |
| Voice Input | ✅ | Whisper-powered transcription |
| MCP Server | ✅ | External AI agent integration |
| Omni-Search | ✅ | Cross-entity search (Cmd+K) |
| Audit Logging | ✅ | Complete activity trail |
| Notifications | ✅ | In-app notification system |
| Data Import/Export | ✅ | CSV import and bulk export |

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

### Accounts

Company/organization management with health scoring.

**Fields:** name, industry, website, phone, address, annualRevenue, employeeCount, type, rating, assignedTo, customFields

**Types:** PROSPECT, CUSTOMER, PARTNER, VENDOR

**Features:**
- Related contacts list
- Related opportunities
- Health score tracking
- Invoice history
- Renewal tracking

### Opportunities

Deal tracking with sales pipeline.

**Fields:** name, value, currency, probability, accountId, stageId, expectedCloseDate, closedWon, lostReason, assignedTo, customFields

**Currencies:** 16 supported (USD, EUR, GBP, AED, EGP, SAR, etc.)

**Features:**
- Pipeline stage progression
- Win/loss tracking
- Revenue forecasting
- Related invoices

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

**Supported Field Types:**

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

**Relationship Validation:**

```typescript
// Validates that relationship IDs exist before save
const validation = await validateRelationships(orgId, fields, data);
if (!validation.valid) {
  // { account_link: "Account record not found: abc-123" }
}
```

**Referential Integrity:**

When a record is deleted, all relationship fields pointing to it are automatically set to `null` across all modules.

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

Natural language interface to CRM operations.

**Example Commands:**

```
"Create a lead for John Smith at Acme Corp"
"Show me all high-priority tickets"
"What's the health score for TechStart Inc?"
"Find all opportunities closing this month over $50k"
"Create a follow-up task for tomorrow"
"Send invoice INV-0042 to the client"
```

### AI Tools (44 Total)

**Sales Tools (11):**
- createLead, searchLeads, updateLead, deleteLead
- createContact, searchContacts
- createAccount, searchAccounts
- createOpportunity, searchOpportunities
- createNote

**Invoicing Tools (4):**
- createInvoice, searchInvoices, updateInvoiceStatus, recordPayment

**CS Tools (8):**
- createTicket, searchTickets, updateTicket, addTicketMessage
- getHealthScore, searchAtRiskAccounts
- searchPlaybooks, runPlaybook

**Marketing Tools (6):**
- createCampaign, searchCampaigns
- createSegment, searchSegments
- createForm, searchForms

**Task Tools (3):**
- createTask, completeTask, searchTasks

**Custom Module Tools (5):**
- createCustomModule, createCustomField
- createCustomModuleRecord, searchCustomModuleRecords
- listCustomModules

**Document Tools (3):**
- searchDocuments, getDocumentStats, analyzeDocument

**Integration Tools (6):**
- getConnectedIntegrations, sendEmail
- createCalendarEvent, sendSlackMessage
- createGitHubIssue, executeExternalTool

**Utility Tools (2):**
- getDashboardStats, searchActivities

### MCP Server

External AI agents can connect via Model Context Protocol.

**Connection:**

```bash
# SSE Connection (for real-time streaming)
GET /api/mcp/sse?token=<api_key>

# JSON-RPC Messages
POST /api/mcp
Headers:
  X-Session-ID: <session_id>
  X-API-Key: <api_key>
```

**Claude Desktop Configuration:**

```json
{
  "mcpServers": {
    "y-crm": {
      "url": "https://your-domain.com/api/mcp/sse",
      "token": "your-mcp-api-key"
    }
  }
}
```

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
├── Ticket ──── TicketMessage[]
├── Playbook ── PlaybookRun[]
├── Campaign ── Segment (FK)
├── Segment
├── Form ────── FormSubmission[]
├── CustomModule ──┬── CustomFieldDefinition[]
│                  └── CustomModuleRecord[]
├── CustomFieldDefinition (for built-in modules)
├── DashboardConfig
├── Notification
├── AuditLog
└── UsageRecord
```

### Key Tables

| Table | Records | Purpose |
|-------|---------|---------|
| Organization | Multi-tenant root | Tenant isolation |
| Lead | Sales leads | Lead management |
| Contact | People | Contact management |
| Account | Companies | Account management |
| Opportunity | Deals | Pipeline tracking |
| Invoice | Invoices | Billing |
| InvoiceItem | Line items | Invoice details |
| Payment | Payments | Payment tracking |
| Ticket | Support tickets | CS ticketing |
| CustomModule | Custom entities | Extensibility |
| CustomModuleRecord | Custom data | Custom module records |
| CustomFieldDefinition | Field schemas | Dynamic fields |
| AuditLog | All changes | Compliance |

---

## 📡 API Reference

### Authentication

All API routes require Clerk authentication. Organization context is determined by the user's active organization.

### Core Endpoints

**Leads:**
```
GET    /api/leads              # List leads
POST   /api/leads              # Create lead
GET    /api/leads/:id          # Get lead
PUT    /api/leads/:id          # Update lead
DELETE /api/leads/:id          # Delete lead
POST   /api/leads/:id/convert  # Convert to contact/account/opportunity
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
POST   /api/opportunities/:id/close  # Close won/lost
```

**Invoices:**
```
GET    /api/invoices           # List invoices
POST   /api/invoices           # Create invoice
GET    /api/invoices/:id       # Get invoice
PUT    /api/invoices/:id       # Update invoice
DELETE /api/invoices/:id       # Delete invoice
POST   /api/invoices/:id/send  # Mark as sent
POST   /api/invoices/:id/payments  # Record payment
GET    /api/invoices/:id/pdf   # Generate PDF
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
GET    /api/team                        # List team members
POST   /api/roles                       # Create role
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
-- Applied via migration 20251215000000
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
│   │   ├── sales/
│   │   │   ├── invoices/          # Invoicing module
│   │   │   ├── pipeline/          # Pipeline views
│   │   │   └── reports/           # Sales reports
│   │   ├── cs/                    # Customer Success
│   │   │   ├── tickets/
│   │   │   ├── health/
│   │   │   ├── playbooks/
│   │   │   └── renewals/
│   │   ├── marketing/             # Marketing workspace
│   │   │   ├── campaigns/
│   │   │   ├── segments/
│   │   │   └── forms/
│   │   ├── modules/               # Custom modules UI
│   │   ├── assistant/             # AI Assistant
│   │   ├── dashboard/             # Main dashboard
│   │   ├── tasks/                 # Tasks module
│   │   ├── documents/             # Documents
│   │   └── settings/              # All settings
│   │       ├── custom-fields/
│   │       ├── modules/
│   │       ├── pipeline/
│   │       ├── roles/
│   │       ├── team/
│   │       ├── branding/
│   │       ├── data/
│   │       └── integrations/
│   ├── api/                       # API routes
│   │   ├── accounts/
│   │   ├── contacts/
│   │   ├── leads/
│   │   ├── opportunities/
│   │   ├── invoices/
│   │   ├── custom-modules/
│   │   ├── modules/[slug]/records/
│   │   ├── ai/
│   │   ├── mcp/
│   │   ├── voice/
│   │   ├── search/
│   │   ├── team/
│   │   ├── roles/
│   │   ├── permissions/
│   │   ├── settings/
│   │   ├── cs/
│   │   ├── marketing/
│   │   └── notifications/
│   └── select-org/                # Organization selector
├── components/
│   ├── ui/                        # Shadcn components
│   ├── forms/                     # Entity forms
│   │   ├── custom-fields-renderer.tsx
│   │   └── assignee-selector.tsx
│   ├── dashboard/                 # Dashboard widgets
│   ├── layout/                    # App shell
│   ├── can-access.tsx             # Permission gate
│   └── voice/                     # Voice input
├── hooks/
│   ├── use-permissions.tsx
│   └── use-chat.ts
├── lib/
│   ├── ai/                        # AI agent & tools
│   ├── relationships/             # Relationship system
│   │   ├── index.ts               # Validation & integrity
│   │   └── search-index.ts        # Search optimization
│   ├── validation/                # Zod schemas
│   │   ├── schemas.ts
│   │   └── custom-fields.ts
│   ├── constants/
│   │   └── currencies.ts          # Currency list
│   ├── mcp/                       # MCP server
│   ├── auth.ts
│   ├── db.ts
│   ├── audit.ts
│   ├── cache.ts
│   ├── permissions.ts
│   ├── api-permissions.ts
│   ├── notifications.ts
│   └── rate-limit.ts
├── prisma/
│   ├── schema.prisma              # Database schema
│   └── migrations/
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

### Optional

| Variable | Description | Default |
|----------|-------------|---------|
| `NEXT_PUBLIC_APP_URL` | Application URL | `http://localhost:3000` |
| `MCP_API_KEY` | MCP server auth key | — |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob token | — |
| `R2_ENDPOINT` | Cloudflare R2 URL | — |
| `R2_ACCESS_KEY_ID` | R2 access key | — |
| `R2_SECRET_ACCESS_KEY` | R2 secret | — |
| `R2_BUCKET_NAME` | R2 bucket | — |
| `COMPOSIO_API_KEY` | Composio integrations | — |

---

## 🚀 Deployment

### Vercel (Recommended)

1. Push repository to GitHub
2. Import project in Vercel Dashboard
3. Add environment variables
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
