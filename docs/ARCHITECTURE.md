# Y CRM - Architecture Documentation

## Overview

Y CRM is an AI-native CRM platform built with Next.js 14, designed for small and medium businesses. The architecture emphasizes modularity, scalability, and AI-first design principles.

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              CLIENT LAYER                                │
├─────────────────────────────────────────────────────────────────────────┤
│  Next.js App Router │ React 18 │ Shadcn UI │ Tailwind CSS │ React Query │
├─────────────────────────────────────────────────────────────────────────┤
│                              API LAYER                                   │
├─────────────────────────────────────────────────────────────────────────┤
│  REST API Routes │ RBAC Middleware │ Rate Limiting │ Validation (Zod)   │
├─────────────────────────────────────────────────────────────────────────┤
│                           AI & INTEGRATION LAYER                         │
├─────────────────────────────────────────────────────────────────────────┤
│  Gemini LLM │ OpenAI Whisper │ MCP Server │ Vercel AI SDK │ Composio    │
├─────────────────────────────────────────────────────────────────────────┤
│                              DATA LAYER                                  │
├─────────────────────────────────────────────────────────────────────────┤
│  PostgreSQL (Prisma) │ Redis (Caching/Rate Limit) │ Blob Storage        │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Directory Structure

### `/app` - Next.js App Router

```
app/
├── (auth)/                    # Authentication routes (Clerk)
│   ├── sign-in/
│   └── sign-up/
├── (dashboard)/               # Protected dashboard routes
│   ├── layout.tsx            # Dashboard layout with sidebar
│   ├── error.tsx             # Error boundary
│   ├── accounts/             # Accounts module
│   ├── assistant/            # AI chat interface
│   ├── contacts/             # Contacts module
│   ├── cs/                   # Customer Success workspace
│   ├── dashboard/            # Main dashboard with widgets
│   ├── documents/            # Document management
│   ├── leads/                # Leads module
│   ├── marketing/            # Marketing workspace
│   ├── modules/              # Custom modules
│   ├── opportunities/        # Opportunities module
│   ├── pipeline/             # Kanban pipeline views
│   ├── reports/              # Analytics & reports
│   ├── sales/                # Sales workspace
│   ├── settings/             # All settings pages
│   └── tasks/                # Task management
├── api/                       # API routes
│   ├── ai/                   # AI chat endpoint
│   ├── audit-logs/           # Audit trail
│   ├── cs/                   # CS-specific endpoints
│   ├── debug/                # Debug endpoints (dev only)
│   ├── marketing/            # Marketing endpoints
│   ├── mcp/                  # MCP server (SSE + JSON-RPC)
│   ├── notifications/        # Notification system
│   ├── permissions/          # RBAC permissions
│   ├── roles/                # Role management
│   ├── search/               # Omni-search
│   ├── team/                 # Team management
│   └── voice/                # Voice transcription
├── select-org/               # Organization selection page
├── layout.tsx                # Root layout
└── page.tsx                  # Landing page
```

### `/components` - React Components

```
components/
├── can-access.tsx            # Permission gate component
├── dashboard/                # Dashboard widgets
│   ├── widgets/              # 15+ widget components
│   ├── dashboard-grid.tsx    # Grid layout
│   ├── widget-renderer.tsx   # Widget factory
│   └── add-widget-dialog.tsx # Widget picker
├── data/                     # Data tables
├── forms/                    # Entity forms
├── layout/                   # Layout components
│   ├── dynamic-sidebar.tsx   # Main sidebar
│   ├── header.tsx            # Top header
│   ├── omni-search.tsx       # Cmd+K search
│   ├── notification-dropdown.tsx
│   └── workspace-switcher.tsx
├── providers/                # Context providers
│   └── dashboard-providers.tsx
├── ui/                       # Shadcn components
└── voice/                    # Voice input
```

### `/lib` - Core Libraries

```
lib/
├── ai/                       # AI integration
│   ├── agent.ts              # AI agent configuration
│   ├── tools.ts              # 44 AI tools
│   └── providers.ts          # LLM providers
├── api-permissions.ts        # API route permission helpers
├── auth.ts                   # Auth context & auto-setup
├── audit.ts                  # Audit logging
├── blob.ts                   # Vercel Blob storage
├── cache.ts                  # Redis caching
├── db.ts                     # Prisma client
├── mcp/                      # MCP server implementation
├── notifications.ts          # Notification helpers
├── permissions.ts            # RBAC utilities
├── rate-limit.ts             # Rate limiting
├── validation/               # Zod schemas
├── voice/                    # Voice transcription
└── workspace/                # Workspace context
```

---

## Authentication Flow

```
┌──────────┐    ┌──────────┐    ┌─────────────┐    ┌──────────────┐
│  User    │───▶│  Clerk   │───▶│  Middleware │───▶│  Dashboard   │
└──────────┘    └──────────┘    └─────────────┘    └──────────────┘
                                       │
                                       ▼
                              ┌─────────────────┐
                              │  Has Active Org? │
                              └────────┬────────┘
                                       │
                         ┌─────────────┴─────────────┐
                         │ NO                        │ YES
                         ▼                           ▼
                ┌─────────────────┐         ┌──────────────┐
                │  /select-org    │         │  Dashboard   │
                │  Auto-select    │         │  with RBAC   │
                └─────────────────┘         └──────────────┘
```

### Organization Auto-Setup

When a new organization is detected:

1. Create Organization record
2. Create default pipeline stages (Lead + Opportunity)
3. Create 4 default roles (Admin, Manager, Rep, Read Only)
4. Assign Admin role to organization creator

When a new team member joins:

1. Detect user has no role
2. Assign default role (Rep)

---

## RBAC Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        RBAC SYSTEM                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────┐    ┌──────────┐    ┌─────────────┐               │
│  │   Role   │───▶│Permission│───▶│   Module    │               │
│  │          │    │          │    │   Actions   │               │
│  │ - Admin  │    │ - Module │    │ - view      │               │
│  │ - Manager│    │ - Actions│    │ - create    │               │
│  │ - Rep    │    │ - Fields │    │ - edit      │               │
│  │ - Custom │    │          │    │ - delete    │               │
│  └──────────┘    └──────────┘    └─────────────┘               │
│       │                                                         │
│       ▼                                                         │
│  ┌──────────┐                                                   │
│  │ UserRole │ Links User ──▶ Role ──▶ Organization             │
│  └──────────┘                                                   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Permission Check Flow

**API Routes:**
```
Request ──▶ getApiAuthContext() ──▶ checkRoutePermission() ──▶ Handler
                   │                        │
                   ▼                        ▼
              userId, orgId           403 if denied
```

**UI Components:**
```
Component ──▶ usePermissions() ──▶ can(module, action) ──▶ Render/Hide
                    │
                    ▼
            PermissionsProvider (fetches /api/permissions/me)
```

---

## AI Architecture

### AI Agent (Gemini)

```
┌─────────────────────────────────────────────────────────────────┐
│                        AI AGENT                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  User Message ──▶ System Prompt ──▶ Gemini 2.0 Flash            │
│                        │                    │                    │
│                        ▼                    ▼                    │
│                   CRM Context          Tool Execution            │
│                   - Org ID             - 44 Tools                │
│                   - User ID            - Multi-step              │
│                   - Workspace                                    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Tool Categories

| Category | Tools | Description |
|----------|-------|-------------|
| Sales | 11 | Lead, Contact, Account, Opportunity CRUD |
| CS | 8 | Tickets, Health, Playbooks |
| Marketing | 6 | Campaigns, Segments, Forms |
| Tasks | 3 | Create, Complete, Search |
| Custom | 5 | Custom modules & fields |
| Documents | 3 | Search, Stats, Analyze |
| Integrations | 6 | Email, Calendar, Slack, GitHub |
| Utilities | 2 | Dashboard stats, Activities |

### MCP Server

Model Context Protocol server for external AI agents:

```
External Agent (Claude, etc.)
        │
        ▼
  ┌───────────────┐
  │ /api/mcp/sse  │ ◀──── SSE Connection
  └───────────────┘
        │
        ▼
  ┌───────────────┐
  │  /api/mcp     │ ◀──── JSON-RPC Messages
  └───────────────┘
        │
        ▼
  ┌───────────────┐
  │  MCP Handler  │ ──── Same 44 Tools
  └───────────────┘
```

---

## Caching Strategy

### Redis Cache Layers

| Layer | TTL | Purpose |
|-------|-----|---------|
| Permissions | 5 min | User role & permissions |
| Dashboard | 1 min | Widget data |
| Search | 30 sec | Search results |
| Rate Limit | 1 min | Request counting |

### React Query Cache

| Query | Stale Time | Cache Time |
|-------|------------|------------|
| List queries | 30 sec | 5 min |
| Detail queries | 1 min | 10 min |
| Dashboard | 1 min | 5 min |

---

## Database Schema Overview

### Entity Relationships

```
Organization (Tenant)
├── Roles ──▶ Permissions
├── UserRoles ──▶ Users
├── Leads ──▶ Notes, Tasks, Activities, Documents
├── Contacts ──▶ Account
├── Accounts ──▶ Contacts, Opportunities, Tickets, Health
├── Opportunities ──▶ Notes, Tasks
├── Tickets ──▶ Messages
├── Campaigns ──▶ Segments
├── CustomModules ──▶ CustomModuleRecords, CustomFieldDefinitions
├── PipelineStages
├── DashboardConfigs
└── AuditLogs
```

---

## Security Measures

### Authentication
- Clerk-managed sessions
- JWT validation on every request
- Organization-scoped access

### Authorization
- RBAC permission checks
- API route protection
- UI component gating

### Data Protection
- Multi-tenant isolation (orgId on every query)
- Input validation (Zod schemas)
- SQL injection prevention (Prisma)

### Rate Limiting
- Redis-based sliding window
- Per-user and per-org limits
- AI call quotas

### Audit Trail
- All mutations logged
- Actor tracking (User, AI, System)
- State snapshots (before/after)

---

## Performance Optimizations

### Server-Side
- React cache() for request deduplication
- Prisma query optimization
- Redis caching for frequent queries
- Parallel data fetching

### Client-Side
- React Query caching
- Optimistic updates
- Virtual scrolling for large lists
- Code splitting per route

### Database
- Indexed queries (orgId, createdAt, status)
- Pagination on all list endpoints
- Select only needed fields

---

## Deployment Architecture

### Vercel (Production)

```
┌─────────────────────────────────────────┐
│              Vercel Edge                 │
├─────────────────────────────────────────┤
│  Next.js App │ Serverless Functions     │
├─────────────────────────────────────────┤
│        │              │                  │
│        ▼              ▼                  │
│  ┌──────────┐  ┌────────────┐           │
│  │ Railway  │  │  Railway   │           │
│  │ Postgres │  │   Redis    │           │
│  └──────────┘  └────────────┘           │
│        │                                 │
│        ▼                                 │
│  ┌─────────────────────┐                │
│  │   Vercel Blob /     │                │
│  │   Cloudflare R2     │                │
│  └─────────────────────┘                │
└─────────────────────────────────────────┘
```

### External Services

| Service | Purpose |
|---------|---------|
| Clerk | Authentication & Organizations |
| Google AI | Gemini LLM |
| OpenAI | Whisper Transcription |
| Railway | PostgreSQL + Redis |
| Vercel Blob | File Storage |
| Composio | Third-party Integrations |
