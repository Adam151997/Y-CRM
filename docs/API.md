# Y CRM API Documentation

## Overview

Y CRM provides a comprehensive REST API and MCP (Model Context Protocol) server for integrating with external applications and AI agents.

## Authentication

All API requests require authentication via Clerk. Include the session token in the Authorization header:

```
Authorization: Bearer <session_token>
```

For MCP connections, use an API key:

```
X-API-Key: <your_api_key>
```

---

## REST API Endpoints

### Base URL

```
https://y-crm.vercel.app/api
```

---

## Sales Module

### Leads

#### List Leads
```http
GET /api/leads
```

Query Parameters:
| Parameter | Type | Description |
|-----------|------|-------------|
| status | string | Filter by status (NEW, CONTACTED, QUALIFIED, CONVERTED, LOST) |
| source | string | Filter by source |
| assignedToId | string | Filter by assigned user |
| search | string | Search in name, email, company |

Response:
```json
{
  "leads": [
    {
      "id": "uuid",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john@example.com",
      "phone": "+1234567890",
      "company": "Acme Inc",
      "title": "CEO",
      "source": "WEBSITE",
      "status": "NEW",
      "customFields": {},
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-01T00:00:00Z"
    }
  ],
  "total": 100,
  "page": 1,
  "pageSize": 20
}
```

#### Create Lead
```http
POST /api/leads
```

Request Body:
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "phone": "+1234567890",
  "company": "Acme Inc",
  "title": "CEO",
  "source": "WEBSITE",
  "status": "NEW"
}
```

#### Get Lead
```http
GET /api/leads/:id
```

#### Update Lead
```http
PATCH /api/leads/:id
```

#### Delete Lead
```http
DELETE /api/leads/:id
```

---

### Contacts

#### List Contacts
```http
GET /api/contacts
```

#### Create Contact
```http
POST /api/contacts
```

Request Body:
```json
{
  "firstName": "Jane",
  "lastName": "Smith",
  "email": "jane@example.com",
  "phone": "+1234567890",
  "title": "VP Sales",
  "accountId": "uuid"
}
```

#### Get Contact
```http
GET /api/contacts/:id
```

#### Update Contact
```http
PATCH /api/contacts/:id
```

#### Delete Contact
```http
DELETE /api/contacts/:id
```

---

### Accounts

#### List Accounts
```http
GET /api/accounts
```

Query Parameters:
| Parameter | Type | Description |
|-----------|------|-------------|
| type | string | Filter by type (PROSPECT, CUSTOMER, PARTNER, VENDOR) |
| industry | string | Filter by industry |
| rating | string | Filter by rating (HOT, WARM, COLD) |

#### Create Account
```http
POST /api/accounts
```

#### Get Account
```http
GET /api/accounts/:id
```

#### Update Account
```http
PATCH /api/accounts/:id
```

#### Delete Account
```http
DELETE /api/accounts/:id
```

---

### Opportunities

#### List Opportunities
```http
GET /api/opportunities
```

Query Parameters:
| Parameter | Type | Description |
|-----------|------|-------------|
| stageId | string | Filter by pipeline stage |
| accountId | string | Filter by account |
| closedWon | boolean | Filter by closed status |

#### Create Opportunity
```http
POST /api/opportunities
```

Request Body:
```json
{
  "name": "Enterprise Deal",
  "accountId": "uuid",
  "value": 50000,
  "currency": "USD",
  "probability": 60,
  "stageId": "uuid",
  "expectedCloseDate": "2024-06-01"
}
```

#### Get Opportunity
```http
GET /api/opportunities/:id
```

#### Update Opportunity
```http
PATCH /api/opportunities/:id
```

#### Delete Opportunity
```http
DELETE /api/opportunities/:id
```

---

## Customer Success Module

### Tickets

#### List Tickets
```http
GET /api/cs/tickets
```

Query Parameters:
| Parameter | Type | Description |
|-----------|------|-------------|
| status | string | OPEN, IN_PROGRESS, WAITING, RESOLVED, CLOSED |
| priority | string | LOW, MEDIUM, HIGH, URGENT |
| accountId | string | Filter by account |

#### Create Ticket
```http
POST /api/cs/tickets
```

Request Body:
```json
{
  "subject": "Integration Issue",
  "description": "Unable to connect API",
  "priority": "HIGH",
  "accountId": "uuid",
  "contactId": "uuid"
}
```

#### Get Ticket
```http
GET /api/cs/tickets/:id
```

#### Update Ticket
```http
PATCH /api/cs/tickets/:id
```

#### Add Ticket Message
```http
POST /api/cs/tickets/:id/messages
```

Request Body:
```json
{
  "content": "We're looking into this issue.",
  "isInternal": false
}
```

---

### Health Scores

#### List Health Scores
```http
GET /api/cs/health
```

Query Parameters:
| Parameter | Type | Description |
|-----------|------|-------------|
| riskLevel | string | LOW, MEDIUM, HIGH, CRITICAL |

#### Get Account Health
```http
GET /api/cs/health/:accountId
```

#### Update Health Score
```http
PATCH /api/cs/health/:accountId
```

---

### Playbooks

#### List Playbooks
```http
GET /api/cs/playbooks
```

#### Create Playbook
```http
POST /api/cs/playbooks
```

#### Get Playbook
```http
GET /api/cs/playbooks/:id
```

#### Run Playbook
```http
POST /api/cs/playbooks/:id/run
```

Request Body:
```json
{
  "accountId": "uuid"
}
```

---

## Marketing Module

### Campaigns

#### List Campaigns
```http
GET /api/marketing/campaigns
```

Query Parameters:
| Parameter | Type | Description |
|-----------|------|-------------|
| status | string | DRAFT, SCHEDULED, ACTIVE, PAUSED, COMPLETED |
| type | string | EMAIL, SOCIAL, EVENT, WEBINAR, SMS, ADS |

#### Create Campaign
```http
POST /api/marketing/campaigns
```

Request Body:
```json
{
  "name": "Summer Promo",
  "type": "EMAIL",
  "status": "DRAFT",
  "startDate": "2024-06-01",
  "endDate": "2024-06-30",
  "budget": 5000
}
```

---

### Segments

#### List Segments
```http
GET /api/marketing/segments
```

#### Create Segment
```http
POST /api/marketing/segments
```

Request Body:
```json
{
  "name": "Enterprise Leads",
  "type": "DYNAMIC",
  "rules": {
    "conditions": [
      { "field": "company_size", "operator": "gte", "value": 100 }
    ]
  }
}
```

---

### Forms

#### List Forms
```http
GET /api/marketing/forms
```

#### Create Form
```http
POST /api/marketing/forms
```

---

## MCP Server

### Connection

Connect to the MCP server via Server-Sent Events:

```
GET /api/mcp/sse?token=<api_key>
```

The server returns a `X-Session-ID` header that must be used for subsequent requests.

### Send Message

```http
POST /api/mcp
Headers:
  X-Session-ID: <session_id>
  X-API-Key: <api_key>
  Content-Type: application/json

Body:
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "ycrm_create_lead",
    "arguments": {
      "firstName": "John",
      "lastName": "Doe",
      "email": "john@example.com"
    }
  }
}
```

### Available MCP Tools

| Tool | Description |
|------|-------------|
| ycrm_create_lead | Create a new lead |
| ycrm_search_leads | Search leads |
| ycrm_create_contact | Create a contact |
| ycrm_create_account | Create an account |
| ycrm_create_task | Create a task |
| ycrm_create_opportunity | Create an opportunity |
| ycrm_create_ticket | Create a support ticket |
| ycrm_search_tickets | Search tickets |
| ycrm_get_health_score | Get account health |
| ycrm_search_playbooks | List playbooks |
| ycrm_create_campaign | Create a campaign |
| ycrm_search_campaigns | Search campaigns |
| ycrm_create_segment | Create an audience segment |
| ycrm_create_form | Create a lead capture form |
| ycrm_list_custom_modules | List custom modules |
| ycrm_create_custom_module | Create a custom module |
| ycrm_get_dashboard | Get dashboard stats |

---

## AI Chat

### Send Message
```http
POST /api/ai/chat
```

Request Body:
```json
{
  "messages": [
    { "role": "user", "content": "Create a new lead for John Smith at Acme Inc" }
  ],
  "workspace": "sales"
}
```

Response (streaming):
```
data: {"type":"text","content":"I'll create that lead for you..."}
data: {"type":"tool_call","name":"createLead","args":{...}}
data: {"type":"tool_result","result":{...}}
data: {"type":"text","content":"Done! I've created the lead for John Smith."}
```

---

## Error Handling

All errors follow this format:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {}
  }
}
```

Common Error Codes:
| Code | HTTP Status | Description |
|------|-------------|-------------|
| UNAUTHORIZED | 401 | Missing or invalid authentication |
| FORBIDDEN | 403 | Insufficient permissions |
| NOT_FOUND | 404 | Resource not found |
| VALIDATION_ERROR | 400 | Invalid request body |
| RATE_LIMITED | 429 | Too many requests |
| INTERNAL_ERROR | 500 | Server error |

---

## Rate Limiting

- API: 100 requests per minute per user
- AI Chat: Based on organization plan
  - Free: 100 calls/month
  - Pro: 1,000 calls/month
  - Enterprise: Unlimited

Rate limit headers are included in responses:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1609459200
```
