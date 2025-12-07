# Y CRM - Agentic Operating System for SMBs

An AI-native CRM with voice commands, multi-step workflows, and semantic search.

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- npm or yarn
- PostgreSQL database (Railway recommended)
- Redis (Railway recommended)
- Clerk account for authentication

### Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   
   Create a `.env.local` file with your credentials (see `.env.example` for reference):
   ```bash
   # Database
   DATABASE_URL="postgresql://..."
   
   # Clerk Auth
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_..."
   CLERK_SECRET_KEY="sk_..."
   
   # Google Gemini (LLM)
   GOOGLE_GENERATIVE_AI_API_KEY="..."
   
   # Redis (Rate Limiting)
   REDIS_URL="redis://..."
   ```

3. **Push database schema:**
   ```bash
   npm run db:push
   ```

4. **Generate Prisma client:**
   ```bash
   npm run db:generate
   ```

5. **(Optional) Seed demo data:**
   ```bash
   npm run db:seed
   ```

6. **Start development server:**
   ```bash
   npm run dev
   ```

7. **Open** [http://localhost:3000](http://localhost:3000)

---

## 📁 Project Structure

```
y-crm/
├── app/
│   ├── (auth)/           # Auth pages (sign-in)
│   ├── (dashboard)/      # Main app pages
│   │   ├── dashboard/    # Dashboard
│   │   ├── leads/        # Leads module
│   │   ├── contacts/     # Contacts module (TODO)
│   │   ├── accounts/     # Accounts module (TODO)
│   │   └── ...
│   ├── api/              # API routes
│   │   ├── leads/
│   │   ├── notes/
│   │   ├── tasks/
│   │   └── ...
│   └── layout.tsx        # Root layout
├── components/
│   ├── layout/           # Sidebar, Header
│   ├── providers/        # React Query, Theme
│   └── ui/               # Shadcn UI components
├── lib/
│   ├── auth.ts           # Auth utilities
│   ├── audit.ts          # Audit logging
│   ├── db.ts             # Prisma client
│   ├── rate-limit.ts     # Rate limiting
│   └── validation/       # Zod schemas
├── prisma/
│   ├── schema.prisma     # Database schema
│   └── seed.ts           # Seed data
└── types/
    └── index.ts          # TypeScript types
```

---

## 🛠️ Available Scripts

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
| `npm run db:seed` | Seed database with demo data |

---

## 📊 Database Schema

### Core Entities
- **Organization** - Multi-tenancy support
- **Lead** - Sales leads
- **Contact** - Business contacts
- **Account** - Companies/organizations
- **Opportunity** - Sales opportunities
- **Task** - To-dos and follow-ups
- **Note** - Notes attached to entities
- **Activity** - Activity timeline
- **Document** - File attachments

### Configuration
- **PipelineStage** - Customizable pipelines
- **CustomFieldDefinition** - Dynamic fields

### System
- **AuditLog** - Full audit trail
- **UsageRecord** - Usage tracking

---

## 🔐 Authentication

This project uses [Clerk](https://clerk.com) for authentication:

- Email/password sign-in
- OAuth providers (Google, GitHub, etc.)
- Organization management (multi-tenancy)
- Role-based access control

---

## 🎯 Features

### ✅ Implemented
- [x] Dashboard with stats and widgets
- [x] Leads module (CRUD, filtering, pagination)
- [x] Lead detail view with notes, tasks, activity
- [x] Pipeline stages (customizable)
- [x] Audit logging
- [x] Rate limiting
- [x] Custom fields validation
- [x] Dark/light theme

### 🚧 In Progress
- [ ] Contacts module
- [ ] Accounts module
- [ ] Opportunities module
- [ ] Tasks module (standalone)
- [ ] Pipeline/Kanban view

### 📋 Planned
- [ ] Voice commands (AI)
- [ ] MCP tool integration
- [ ] Semantic search (pgvector)
- [ ] Import/Export (CSV)
- [ ] Reports & analytics
- [ ] Email integration
- [ ] Calendar integration

---

## 🔧 Tech Stack

| Component | Technology |
|-----------|------------|
| Framework | Next.js 14 (App Router) |
| Auth | Clerk |
| Database | PostgreSQL + pgvector |
| ORM | Prisma |
| UI | Shadcn UI + Tailwind CSS |
| State | React Query + Zustand |
| AI | Vercel AI SDK + Gemini |
| Forms | React Hook Form + Zod |
| Rate Limiting | Redis |

---

## 📝 Environment Variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk public key |
| `CLERK_SECRET_KEY` | Clerk secret key |
| `GOOGLE_GENERATIVE_AI_API_KEY` | Gemini API key |
| `REDIS_URL` | Redis connection string |
| `NEXT_PUBLIC_APP_URL` | App URL (default: http://localhost:3000) |

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

---

## 📄 License

MIT License - see LICENSE file for details.
