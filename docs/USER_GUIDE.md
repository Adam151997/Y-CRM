# Y CRM User Guide

## Welcome to Y CRM

Y CRM is an AI-powered Customer Relationship Management system designed for small and medium businesses. It combines traditional CRM capabilities with intelligent AI assistants to help you manage Sales, Customer Success, and Marketing operations.

---

## Getting Started

### 1. Sign Up / Sign In

1. Navigate to [y-crm.vercel.app](https://y-crm.vercel.app)
2. Click "Get Started" or "Sign In"
3. Create an account or sign in with your existing credentials
4. You'll be taken to your dashboard

### 2. Understanding Workspaces

Y CRM is organized into three main workspaces:

| Workspace | Purpose | Key Modules |
|-----------|---------|-------------|
| **Sales** | Manage leads and deals | Leads, Contacts, Accounts, Opportunities, Pipeline |
| **Customer Success** | Support existing customers | Tickets, Health Scores, Playbooks |
| **Marketing** | Run campaigns | Campaigns, Segments, Forms |

Switch between workspaces using the dropdown in the sidebar.

---

## Sales Workspace

### Leads

Leads are potential customers who have shown interest in your product.

**To create a lead:**
1. Go to Sales → Leads
2. Click "Add Lead"
3. Fill in the required fields (First Name, Last Name)
4. Add optional details (Email, Phone, Company, Source)
5. Click "Create Lead"

**Lead Statuses:**
- **New** - Just added, not contacted yet
- **Contacted** - You've reached out
- **Qualified** - Shows buying potential
- **Converted** - Became a customer
- **Lost** - Not moving forward

**Converting Leads:**
When a lead is ready to become a customer, click "Convert" to create a Contact and Account.

### Contacts

Contacts are individual people at companies you do business with.

### Accounts

Accounts represent companies/organizations.

**Account Types:**
- **Prospect** - Potential customer
- **Customer** - Active customer
- **Partner** - Business partner
- **Vendor** - Supplier

### Opportunities

Opportunities track potential deals through your sales pipeline.

**Key Fields:**
- **Value** - Deal amount
- **Probability** - Likelihood to close (0-100%)
- **Expected Close Date** - When you expect to close
- **Stage** - Current pipeline stage

### Pipeline View

The Pipeline shows all opportunities in a Kanban board view. Drag and drop deals between stages.

---

## Customer Success Workspace

### Tickets

Support tickets track customer issues and requests.

**Ticket Priority Levels:**
- **Low** - Minor issues, no urgency
- **Medium** - Standard issues
- **High** - Important, needs attention
- **Urgent** - Critical, immediate attention needed

**Ticket Statuses:**
- **Open** - New ticket
- **In Progress** - Being worked on
- **Waiting** - Waiting for customer response
- **Resolved** - Issue fixed
- **Closed** - Completed

### Health Scores

Health Scores give you a quick view of account health.

**Risk Levels:**
- 🟢 **Low Risk** (Score 70-100) - Healthy customer
- 🟡 **Medium Risk** (Score 40-69) - Some concerns
- 🟠 **High Risk** (Score 20-39) - Needs attention
- 🔴 **Critical** (Score 0-19) - At risk of churn

**Health Components:**
- Product Usage
- Support Tickets
- NPS Score
- Engagement
- Payment Status

### Playbooks

Playbooks are automated workflows for common CS scenarios.

**Example Playbooks:**
- Onboarding new customers
- Quarterly business reviews
- At-risk customer outreach
- Renewal preparation

**To run a playbook:**
1. Go to Playbooks
2. Select a playbook
3. Click "Run Playbook"
4. Choose the account
5. The system creates tasks automatically

---

## Marketing Workspace

### Campaigns

Campaigns track your marketing initiatives.

**Campaign Types:**
- Email
- Social Media
- Events
- Webinars
- SMS
- Ads

**Campaign Statuses:**
- **Draft** - Being created
- **Scheduled** - Ready to launch
- **Active** - Currently running
- **Paused** - Temporarily stopped
- **Completed** - Finished

### Segments

Segments group contacts based on criteria.

**Segment Types:**
- **Dynamic** - Automatically updates based on rules
- **Static** - Fixed list of contacts

**Example Rules:**
- Company size > 100 employees
- Industry = Technology
- Lead source = Website

### Forms

Forms capture leads from your website.

**Form Features:**
- Custom fields
- Required field validation
- Auto-create leads
- Redirect URL after submission

---

## AI Assistant

The AI Assistant can help you with tasks across all workspaces.

### How to Use

1. Click the AI Assistant icon (💬) in the header
2. Type your request in natural language
3. The assistant will understand and take action

### Example Commands

**Sales:**
- "Create a new lead for John Smith at Acme Inc"
- "Show me all qualified leads"
- "Update the opportunity for Acme to $50,000"
- "Add a follow-up task for tomorrow"

**Customer Success:**
- "Create a ticket for account Acme about API issues"
- "Show me all at-risk accounts"
- "Run the onboarding playbook for new customer XYZ"
- "What's the health score for Acme?"

**Marketing:**
- "Create an email campaign for the summer promotion"
- "Show me all active campaigns"
- "Create a segment for enterprise leads"

### Tips for Best Results

1. Be specific with names and details
2. The assistant remembers context within a conversation
3. You can chain requests: "Create a lead and add a follow-up task"
4. Ask for clarification if needed

---

## Dashboard Customization

### Widgets

Each workspace has customizable widgets:

**Sales Widgets:**
- Quick Stats
- Leads by Status
- Pipeline Value
- Deals Closing Soon
- Recent Activity
- Tasks Due Today

**CS Widgets:**
- Open Tickets
- At-Risk Accounts
- Health Distribution
- Upcoming Renewals

**Marketing Widgets:**
- Campaign Performance
- Form Submissions
- Segment Sizes
- Conversion Rate

### Customizing Your Dashboard

1. Click "Customize" on your dashboard
2. Click "Add Widget" to add new widgets
3. Drag widgets to rearrange
4. Click the X to remove a widget
5. Changes save automatically

---

## Team & Roles

### Managing Your Team

1. Go to Settings → Team
2. View all team members and their roles
3. Click "Invite User" to add new members
4. Use the role dropdown to change a user's role

### Understanding Roles

Y CRM includes four default roles:

| Role | Permissions | Description |
|------|-------------|-------------|
| **Admin** | Full access | Can do everything, including manage team and settings |
| **Manager** | Full access | Can manage all records but not system settings |
| **Rep** | View, Create, Edit | Standard user - can work with data but can't delete |
| **Read Only** | View only | Can see data but can't make changes |

### Creating Custom Roles

1. Go to Settings → Roles & Permissions
2. Click "Create Role"
3. Name your role
4. Configure permissions for each module
5. Click "Save"

### Permission Grid

When editing a role, you'll see a grid with:
- **Rows**: Each CRM module (Leads, Contacts, etc.)
- **Columns**: Actions (View, Create, Edit, Delete, All)
- **Checkboxes**: Enable/disable each permission

### Tips for Role Management

- Start with the default roles and customize as needed
- New team members automatically get the "Rep" role
- Only Admins can manage team and roles
- The Admin role cannot be deleted or modified

---

## Settings

### Pipeline Stages

Customize your opportunity stages:
1. Go to Settings → Pipeline
2. Add, edit, or delete stages
3. Set stage order and colors
4. Set default probabilities

### Custom Fields

Add custom fields to any module:
1. Go to Settings → Custom Fields
2. Select the module (Lead, Contact, Account, etc.)
3. Click "Add Field"
4. Choose field type (Text, Number, Date, Select, etc.)
5. Set field name and options

### Custom Modules

Create entirely new modules:
1. Go to Settings → Modules
2. Click "Create Module"
3. Name your module
4. Add custom fields
5. Access via the sidebar

### Integrations

Connect external tools:
1. Go to Settings → Integrations
2. Available integrations:
   - Email (Gmail, Outlook)
   - Calendar (Google, Outlook)
   - Slack
   - GitHub
3. Click "Connect" and authorize

---

## Omni-Search

The Omni-Search feature lets you quickly find anything in Y CRM:

1. Press `Ctrl/Cmd + K` to open search
2. Start typing to search across all modules
3. Use arrow keys to navigate results
4. Press Enter to open the selected item
5. Press Escape to close

**What You Can Search:**
- Leads (by name, email, company)
- Contacts (by name, email)
- Accounts (by name)
- Opportunities (by name)
- Tickets (by subject)
- Tasks (by title)
- Documents (by name)

---

## Notifications

Y CRM keeps you informed with in-app notifications.

### Notification Types
- New lead assigned to you
- Task due today
- Ticket escalated
- Deal stage changed
- At-risk account alert

### Managing Notifications
1. Click the bell icon in the header
2. View your recent notifications
3. Click a notification to go to the related record
4. Click "Mark all as read" to clear them

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl/Cmd + K` | Open quick search |
| `Ctrl/Cmd + N` | Create new record |
| `Ctrl/Cmd + /` | Open AI Assistant |
| `Esc` | Close modals/dialogs |

---

## Tips & Best Practices

### Lead Management
- Respond to new leads within 24 hours
- Update lead status regularly
- Add notes after every interaction
- Use tasks to schedule follow-ups

### Pipeline Management
- Review pipeline weekly
- Update opportunity values and close dates
- Move stale deals to lost
- Focus on high-probability deals

### Customer Success
- Monitor health scores daily
- Address high-risk accounts immediately
- Use playbooks for consistent processes
- Document resolutions in tickets

### Marketing
- Segment your audience for targeted campaigns
- A/B test email campaigns
- Track form conversion rates
- Review campaign ROI regularly

---

## Support

Need help? Here are your options:

1. **AI Assistant** - Ask the built-in AI for help
2. **Documentation** - Check the docs folder
3. **Email** - support@y-crm.com
4. **GitHub Issues** - For bugs and feature requests

---

## Glossary

| Term | Definition |
|------|------------|
| **Lead** | A potential customer who has shown interest |
| **Contact** | An individual person at a company |
| **Account** | A company or organization |
| **Opportunity** | A potential deal being tracked |
| **Pipeline** | Visual representation of sales stages |
| **Ticket** | A customer support request |
| **Health Score** | Numerical indicator of customer health |
| **Playbook** | Automated workflow for CS tasks |
| **Campaign** | A marketing initiative |
| **Segment** | A group of contacts with shared criteria |
| **Form** | A web form for capturing leads |
| **MCP** | Model Context Protocol for AI integration |
