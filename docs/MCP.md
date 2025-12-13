# Y CRM - MCP Integration Guide

## Overview

Y CRM includes a built-in Model Context Protocol (MCP) server that allows external AI agents (like Claude Desktop, custom AI applications, or other MCP-compatible clients) to interact with your CRM data.

## What is MCP?

The Model Context Protocol is an open standard for connecting AI assistants to external data sources and tools. It enables AI agents to:

- Read data from your CRM
- Create and update records
- Execute complex workflows
- Access real-time business information

## Connection Methods

### 1. Server-Sent Events (SSE) - Recommended

Best for real-time, long-running connections.

```
GET /api/mcp/sse?token=YOUR_API_KEY
```

**Headers:**
```
Accept: text/event-stream
Cache-Control: no-cache
```

### 2. HTTP POST (JSON-RPC)

Best for simple request/response interactions.

```
POST /api/mcp
X-Session-ID: your-session-id
X-API-Key: YOUR_API_KEY
Content-Type: application/json
```

---

## Authentication

### API Key Setup

1. Go to **Settings → Integrations**
2. Find **MCP Server** section
3. Generate an API key
4. Store securely - it won't be shown again

### Environment Variable

Set the `MCP_API_KEY` environment variable for the standalone server:

```bash
export MCP_API_KEY=your-api-key
```

---

## Available Tools

The MCP server exposes 44 tools across all CRM modules:

### Sales Tools

| Tool | Description |
|------|-------------|
| `createLead` | Create a new lead |
| `searchLeads` | Search and filter leads |
| `updateLead` | Update lead properties |
| `deleteLead` | Delete a lead |
| `createContact` | Create a new contact |
| `searchContacts` | Search contacts |
| `createAccount` | Create a new account |
| `searchAccounts` | Search accounts |
| `createOpportunity` | Create an opportunity |
| `searchOpportunities` | Search opportunities |
| `createNote` | Add a note to any record |

### Customer Success Tools

| Tool | Description |
|------|-------------|
| `createTicket` | Create support ticket |
| `searchTickets` | Search tickets |
| `updateTicket` | Update ticket status/priority |
| `addTicketMessage` | Add message to ticket |
| `getHealthScore` | Get account health score |
| `searchAtRiskAccounts` | Find at-risk accounts |
| `searchPlaybooks` | List available playbooks |
| `runPlaybook` | Execute a playbook |
| `createRenewal` | Create renewal tracking |
| `searchRenewals` | Search renewals |
| `updateRenewal` | Update renewal status |
| `getUpcomingRenewals` | Get renewals by timeframe |

### Marketing Tools

| Tool | Description |
|------|-------------|
| `createCampaign` | Create marketing campaign |
| `searchCampaigns` | Search campaigns |
| `createSegment` | Create audience segment |
| `searchSegments` | Search segments |
| `createForm` | Create lead capture form |
| `searchForms` | Search forms |

### Task Tools

| Tool | Description |
|------|-------------|
| `createTask` | Create a task |
| `completeTask` | Mark task complete |
| `searchTasks` | Search tasks |

### Document Tools

| Tool | Description |
|------|-------------|
| `searchDocuments` | Search documents |
| `getDocumentStats` | Get document statistics |
| `analyzeDocument` | AI analysis of document |

### Custom Module Tools

| Tool | Description |
|------|-------------|
| `createCustomModule` | Create new module |
| `createCustomField` | Add field to module |
| `createCustomModuleRecord` | Create record |
| `searchCustomModuleRecords` | Search records |
| `listCustomModules` | List all custom modules |

### Integration Tools

| Tool | Description |
|------|-------------|
| `getConnectedIntegrations` | List connected services |
| `sendEmail` | Send email via Gmail |
| `createCalendarEvent` | Create calendar event |
| `sendSlackMessage` | Send Slack message |

### Utility Tools

| Tool | Description |
|------|-------------|
| `getDashboardStats` | Get dashboard metrics |
| `searchActivities` | Search activity timeline |

---

## Claude Desktop Integration

### Configuration

Add to your Claude Desktop config (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "y-crm": {
      "command": "npx",
      "args": ["-y", "@anthropic/mcp-client"],
      "env": {
        "MCP_SERVER_URL": "https://your-crm.com/api/mcp/sse",
        "MCP_API_KEY": "your-api-key"
      }
    }
  }
}
```

### Alternative: Direct SSE Connection

```json
{
  "mcpServers": {
    "y-crm": {
      "transport": "sse",
      "url": "https://your-crm.com/api/mcp/sse?token=your-api-key"
    }
  }
}
```

---

## Standalone MCP Server

For advanced use cases, run the MCP server independently:

```bash
# Start standalone server
npm run mcp:server

# With custom port
MCP_PORT=3001 npm run mcp:server
```

### Docker Deployment

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
ENV MCP_API_KEY=your-key
EXPOSE 3001
CMD ["npm", "run", "mcp:server"]
```

---

## JSON-RPC Protocol

### Request Format

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "createLead",
    "arguments": {
      "firstName": "John",
      "lastName": "Smith",
      "email": "john@example.com",
      "company": "Acme Corp"
    }
  }
}
```

### Response Format

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "Successfully created lead: John Smith (ID: lead_abc123)"
      }
    ]
  }
}
```

### Error Response

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "error": {
    "code": -32602,
    "message": "Invalid params: email is required"
  }
}
```

---

## Tool Schemas

### createLead

```json
{
  "name": "createLead",
  "description": "Create a new lead in the CRM",
  "inputSchema": {
    "type": "object",
    "properties": {
      "firstName": { "type": "string", "description": "First name" },
      "lastName": { "type": "string", "description": "Last name" },
      "email": { "type": "string", "description": "Email address" },
      "phone": { "type": "string", "description": "Phone number" },
      "company": { "type": "string", "description": "Company name" },
      "title": { "type": "string", "description": "Job title" },
      "source": { 
        "type": "string", 
        "enum": ["WEBSITE", "REFERRAL", "LINKEDIN", "COLD_CALL", "EVENT", "OTHER"]
      }
    },
    "required": ["firstName", "lastName"]
  }
}
```

### searchLeads

```json
{
  "name": "searchLeads",
  "description": "Search for leads with filters",
  "inputSchema": {
    "type": "object",
    "properties": {
      "query": { "type": "string", "description": "Search term" },
      "status": { 
        "type": "string",
        "enum": ["NEW", "CONTACTED", "QUALIFIED", "UNQUALIFIED", "CONVERTED"]
      },
      "source": { "type": "string" },
      "limit": { "type": "number", "default": 10 }
    }
  }
}
```

### createTask

```json
{
  "name": "createTask",
  "description": "Create a task linked to a CRM record",
  "inputSchema": {
    "type": "object",
    "properties": {
      "title": { "type": "string", "description": "Task title" },
      "description": { "type": "string" },
      "priority": { 
        "type": "string",
        "enum": ["LOW", "MEDIUM", "HIGH", "URGENT"]
      },
      "dueDate": { "type": "string", "format": "date" },
      "leadId": { "type": "string" },
      "contactId": { "type": "string" },
      "accountId": { "type": "string" },
      "opportunityId": { "type": "string" }
    },
    "required": ["title"]
  }
}
```

---

## Example Conversations

### Creating Records

**User:** Create a lead for Sarah Johnson, VP of Engineering at TechCorp. Her email is sarah@techcorp.com.

**AI calls:** `createLead`
```json
{
  "firstName": "Sarah",
  "lastName": "Johnson",
  "email": "sarah@techcorp.com",
  "company": "TechCorp",
  "title": "VP of Engineering"
}
```

**Response:** Created lead Sarah Johnson at TechCorp (ID: lead_xyz789)

### Searching Data

**User:** Show me all high-priority tickets that are still open.

**AI calls:** `searchTickets`
```json
{
  "status": "OPEN",
  "priority": "HIGH"
}
```

**Response:** Found 3 open high-priority tickets...

### Complex Workflows

**User:** Find all accounts with health scores below 50 and create follow-up tasks for each.

**AI calls:**
1. `searchAtRiskAccounts` with threshold 50
2. For each account: `createTask` with appropriate details

---

## Security Considerations

### API Key Best Practices

1. **Rotate regularly** - Generate new keys periodically
2. **Limit scope** - Use separate keys for different integrations
3. **Monitor usage** - Check audit logs for suspicious activity
4. **Secure storage** - Never commit keys to version control

### Rate Limits

| Operation | Limit |
|-----------|-------|
| Tool calls | 100/minute |
| SSE connections | 5 concurrent |
| Batch operations | 50 records/call |

### Permissions

MCP operations respect your RBAC settings. The API key inherits permissions from the user who generated it.

---

## Troubleshooting

### Connection Issues

**Problem:** SSE connection drops frequently

**Solution:**
- Check network stability
- Implement reconnection logic
- Use heartbeat/ping messages

### Authentication Errors

**Problem:** 401 Unauthorized

**Solution:**
- Verify API key is correct
- Check key hasn't expired
- Ensure key has required permissions

### Tool Execution Failures

**Problem:** Tool returns error

**Solution:**
- Check input schema matches requirements
- Verify required fields are provided
- Check for valid enum values

### Debugging

Enable verbose logging:

```bash
DEBUG=mcp:* npm run mcp:server
```

---

## Changelog

### v1.0.0
- Initial MCP server release
- 44 tools across all modules
- SSE and HTTP transport support
- Claude Desktop integration
