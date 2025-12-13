# Y CRM - User Guide

## Getting Started

### First Login

1. Navigate to your Y CRM instance
2. Sign in with your email or Google account
3. If you're the first user, an organization will be created automatically
4. You'll be assigned the **Admin** role with full access

### Inviting Team Members

1. Go to **Settings → Team**
2. Click **Invite Member**
3. Enter their email address
4. Select a role (Admin, Manager, Rep, or Read Only)
5. They'll receive an email invitation

---

## Navigation

### Workspaces

Y CRM is organized into three workspaces accessible from the sidebar:

| Workspace | Icon | Purpose |
|-----------|------|---------|
| **Sales** | 💼 | Lead-to-deal pipeline management |
| **Customer Success** | 🎯 | Post-sale customer management |
| **Marketing** | 📣 | Campaign and audience management |

### Global Features

- **Dashboard** - Customizable widget-based overview
- **Tasks** - Cross-module task management
- **Documents** - File storage and management
- **AI Assistant** - Natural language CRM commands
- **Search (Ctrl+K)** - Quick search across all modules

---

## Sales Workspace

### Leads

Leads represent potential customers who have shown interest but haven't been qualified yet.

**Creating a Lead:**
1. Click **+ New Lead** or use AI: *"Create a lead for John Smith at Acme"*
2. Fill in contact information
3. Set source (Website, Referral, LinkedIn, etc.)
4. Lead starts in **New** status

**Lead Statuses:**
- **New** - Just captured, not yet contacted
- **Contacted** - Initial outreach made
- **Qualified** - Meets criteria, ready for sales
- **Unqualified** - Doesn't meet criteria
- **Converted** - Became an opportunity

**Converting a Lead:**
1. Open the lead detail page
2. Click **Convert to Opportunity**
3. An Account, Contact, and Opportunity are created

### Contacts

Contacts are individual people you interact with.

**Key Fields:**
- Name, Email, Phone
- Title/Role
- Associated Account
- Primary Contact flag

### Accounts

Accounts represent companies or organizations.

**Account Types:**
- **Prospect** - Potential customer
- **Customer** - Active paying customer
- **Partner** - Business partner
- **Competitor** - Market competitor
- **Other** - Miscellaneous

**Account Tabs:**
- **Overview** - Basic information and stats
- **Contacts** - People at this company
- **Opportunities** - Active deals
- **Tasks** - Related tasks
- **Notes** - Internal notes
- **Renewals** - Contract renewals (if CS enabled)

### Opportunities

Opportunities track potential deals through your sales pipeline.

**Key Fields:**
- **Name** - Deal identifier
- **Value** - Expected revenue
- **Probability** - Likelihood to close (%)
- **Expected Close Date** - Target close date
- **Stage** - Pipeline position

**Pipeline View:**
- Access via **Sales → Pipeline**
- Drag-and-drop cards between stages
- Visual overview of all active deals

### Pipeline Configuration

Customize your sales stages:
1. Go to **Settings → Pipeline**
2. Add, edit, or reorder stages
3. Set default probability per stage

---

## Customer Success Workspace

### Tickets

Support tickets track customer issues and requests.

**Creating a Ticket:**
1. Click **+ New Ticket**
2. Select Account and Contact
3. Set priority and category
4. Describe the issue

**Ticket Statuses:**
- **Open** - New, awaiting response
- **In Progress** - Being worked on
- **Waiting** - Waiting for customer
- **Resolved** - Issue fixed
- **Closed** - Confirmed complete

**Adding Messages:**
- Public replies go to the customer
- Internal notes (toggle) are team-only

### Health Scores

Health scores help identify at-risk accounts.

**Five Components:**
1. **Engagement** - Product usage and activity
2. **Support** - Ticket volume and satisfaction
3. **Adoption** - Feature utilization
4. **Relationship** - Communication quality
5. **Growth** - Expansion potential

**Risk Levels:**
- 🟢 **Healthy** (80-100)
- 🟡 **Medium Risk** (50-79)
- 🔴 **At Risk** (0-49)

### Playbooks

Automated workflows for common CS scenarios.

**Built-in Triggers:**
- New customer onboarding
- Health score drops
- Renewal approaching
- Ticket escalation

**Creating a Playbook:**
1. Go to **CS → Playbooks**
2. Click **+ New Playbook**
3. Define trigger conditions
4. Add steps (tasks, emails, alerts)

### Renewals

Track contract renewals and prevent churn.

**Renewal Statuses:**
- **Upcoming** - Renewal date approaching
- **In Progress** - Negotiation started
- **Renewed** - Successfully renewed
- **Churned** - Customer lost

**Key Metrics:**
- Contract value
- Renewal probability
- Days until renewal

---

## Marketing Workspace

### Campaigns

Manage marketing campaigns across channels.

**Campaign Types:**
- Email
- Social
- Event
- Webinar
- Content
- Other

**Campaign Workflow:**
1. Create campaign in **Draft** status
2. Build content and select audience
3. Move to **Scheduled** or **Active**
4. Track performance metrics

### Segments

Define target audiences for campaigns.

**Segment Types:**
- **Static** - Manually selected contacts
- **Dynamic** - Rule-based, auto-updating

**Creating Dynamic Segments:**
1. Click **+ New Segment**
2. Add filter rules (industry, company size, etc.)
3. Preview matching contacts
4. Save segment

### Forms

Capture leads through web forms.

**Form Builder:**
1. Create form with custom fields
2. Copy embed code or hosted URL
3. Submissions create leads automatically

---

## AI Assistant

### Accessing the Assistant

- Click **AI Assistant** in the sidebar
- Or use the assistant in any workspace

### Voice Commands

1. Click the **microphone** icon
2. Speak your command
3. AI processes and executes

### Example Commands

**Creating Records:**
- *"Create a lead for Sarah Johnson at TechCorp"*
- *"Add a task to call John tomorrow at 2pm"*
- *"Create an opportunity for $50,000 with Acme"*

**Searching:**
- *"Show me all leads from this week"*
- *"Find opportunities closing this month"*
- *"What's the health score for TechStart?"*

**Analytics:**
- *"What are my dashboard stats?"*
- *"How many leads did we get this month?"*
- *"Show me at-risk accounts"*

**Updates:**
- *"Mark task 'Call John' as complete"*
- *"Update the Acme opportunity to $75,000"*
- *"Close ticket #123 as resolved"*

---

## Dashboard

### Widget System

Your dashboard is fully customizable with drag-and-drop widgets.

**Available Widgets:**
- Quick Stats
- Pipeline Value
- Leads by Status
- Recent Activity
- Tasks Due Today
- Open Tickets
- At-Risk Accounts
- Upcoming Renewals
- Campaign Performance
- And more...

**Customizing:**
1. Click **Customize Dashboard**
2. Drag widgets to reposition
3. Click ✕ to remove widgets
4. Click **+ Add Widget** for new ones
5. Save your layout

---

## Global Search (Ctrl+K)

Press **Ctrl+K** (or **Cmd+K** on Mac) to open quick search.

**Search Across:**
- Leads
- Contacts
- Accounts
- Opportunities
- Tasks
- Tickets
- Documents
- Invoices
- Campaigns
- Custom Modules

**Tips:**
- Type to filter results instantly
- Use arrow keys to navigate
- Press Enter to open
- Results show type icons and colors

---

## Documents

### Uploading Files

1. Go to **Documents**
2. Click **Upload** or drag files
3. Files are stored securely

**Supported Types:**
- PDFs, Word documents
- Images (PNG, JPG, GIF)
- Spreadsheets (Excel, CSV)
- Any file type

### Linking Documents

Documents can be linked to:
- Leads
- Contacts
- Accounts
- Opportunities

---

## Tasks

### Task Properties

- **Title** - What needs to be done
- **Description** - Additional details
- **Priority** - Low, Medium, High, Urgent
- **Due Date** - When it's due
- **Status** - Pending, In Progress, Completed
- **Assignee** - Who's responsible

### Task Links

Tasks can be linked to:
- Leads
- Contacts
- Accounts
- Opportunities
- Tickets

### Quick Actions

- ✓ Click checkbox to complete
- Edit inline from list view
- Bulk select and update

---

## Settings

### Organization Settings

**Settings → Organization**
- Company name
- Default timezone
- Date format preferences

### Branding

**Settings → Branding**
- Upload company logo
- Set brand name (appears on invoices)

### Pipeline Stages

**Settings → Pipeline**
- Customize lead stages
- Customize opportunity stages
- Set default probabilities

### Custom Fields

**Settings → Custom Fields**
- Add fields to any module
- Field types: Text, Number, Date, Select, Multi-select, Checkbox

### Team Management

**Settings → Team**
- View all team members
- Invite new members
- Change user roles
- Remove members

### Roles & Permissions

**Settings → Roles**
- View default roles
- Create custom roles
- Configure granular permissions

### Data Import/Export

**Settings → Data**
- Export any module to CSV
- Import leads, contacts, accounts from CSV
- Map CSV columns to CRM fields

### Integrations

**Settings → Integrations**
- Connect Google (Gmail, Calendar)
- Connect Slack
- View connected services

### Activity Log

**Settings → Activity**
- View all system activity
- Filter by user, module, action
- Export audit logs

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| Ctrl+K | Open global search |
| Ctrl+N | New record (context-aware) |
| Escape | Close modal/dialog |
| ? | Show keyboard shortcuts |

---

## Tips & Best Practices

### Lead Management
- Respond to new leads within 24 hours
- Use lead scoring to prioritize
- Convert qualified leads promptly

### Pipeline Health
- Update opportunity stages regularly
- Keep close dates accurate
- Review stale opportunities weekly

### Customer Success
- Monitor health scores daily
- Address at-risk accounts immediately
- Use playbooks for consistency

### Data Quality
- Keep contact info up-to-date
- Merge duplicate records
- Use consistent naming conventions

### AI Assistant
- Be specific in your commands
- Use natural language
- Check results after bulk operations

---

## Getting Help

### In-App Support
- Use AI Assistant for questions
- Check tooltips on form fields

### Documentation
- API docs at `/docs/API.md`
- This user guide at `/docs/USER_GUIDE.md`

### Feedback
- Use thumbs up/down on AI responses
- Report issues via Settings → Support
