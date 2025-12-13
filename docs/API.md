# Y CRM - API Documentation

## Overview

Y CRM provides a comprehensive REST API for all CRM operations. All endpoints require authentication via Clerk session tokens.

## Base URL

```
Development: http://localhost:3000/api
Production: https://your-domain.com/api
```

## Authentication

All API requests require a valid Clerk session. Include the session token in your requests:

```typescript
const response = await fetch('/api/leads', {
  headers: {
    'Content-Type': 'application/json',
    // Clerk handles auth via cookies automatically in browser
  }
});
```

---

## Leads API

### List Leads
```http
GET /api/leads
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| search | string | Search by name, email, company |
| status | string | Filter by status (NEW, CONTACTED, QUALIFIED, etc.) |
| source | string | Filter by lead source |
| page | number | Page number (default: 1) |
| limit | number | Items per page (default: 20, max: 100) |

**Response:**
```json
{
  "leads": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

### Get Lead
```http
GET /api/leads/:id
```

### Create Lead
```http
POST /api/leads
```

**Request Body:**
```json
{
  "firstName": "John",
  "lastName": "Smith",
  "email": "john@acme.com",
  "phone": "+1-555-0123",
  "company": "Acme Corp",
  "title": "CTO",
  "source": "WEBSITE",
  "status": "NEW"
}
```

### Update Lead
```http
PATCH /api/leads/:id
```

### Delete Lead
```http
DELETE /api/leads/:id
```

---

## Contacts API

### List Contacts
```http
GET /api/contacts
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| search | string | Search by name, email |
| accountId | string | Filter by account |
| page | number | Page number |
| limit | number | Items per page |

### Create Contact
```http
POST /api/contacts
```

**Request Body:**
```json
{
  "firstName": "Sarah",
  "lastName": "Johnson",
  "email": "sarah@company.com",
  "phone": "+1-555-0456",
  "title": "VP of Sales",
  "accountId": "acc_123..."
}
```

---

## Accounts API

### List Accounts
```http
GET /api/accounts
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| search | string | Search by name |
| type | string | Filter by type (PROSPECT, CUSTOMER, PARTNER, etc.) |
| industry | string | Filter by industry |

### Create Account
```http
POST /api/accounts
```

**Request Body:**
```json
{
  "name": "Acme Corporation",
  "type": "CUSTOMER",
  "industry": "Technology",
  "website": "https://acme.com",
  "phone": "+1-555-0789",
  "employees": 500,
  "annualRevenue": 10000000
}
```

---

## Opportunities API

### List Opportunities
```http
GET /api/opportunities
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| accountId | string | Filter by account |
| stageId | string | Filter by pipeline stage |
| closedWon | boolean | Filter by won/lost status |

### Create Opportunity
```http
POST /api/opportunities
```

**Request Body:**
```json
{
  "name": "Enterprise License Deal",
  "value": 50000,
  "probability": 75,
  "expectedCloseDate": "2024-03-31",
  "accountId": "acc_123...",
  "stageId": "stage_456..."
}
```

---

## Tasks API

### List Tasks
```http
GET /api/tasks
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| status | string | PENDING, IN_PROGRESS, COMPLETED |
| priority | string | LOW, MEDIUM, HIGH, URGENT |
| dueDate | string | Filter by due date |
| assigneeId | string | Filter by assignee |

### Create Task
```http
POST /api/tasks
```

**Request Body:**
```json
{
  "title": "Follow up with client",
  "description": "Discuss contract renewal",
  "priority": "HIGH",
  "dueDate": "2024-01-15",
  "leadId": "lead_123...",
  "assigneeId": "user_456..."
}
```

### Complete Task
```http
PATCH /api/tasks/:id
```

**Request Body:**
```json
{
  "status": "COMPLETED"
}
```

---

## Tickets API (Customer Success)

### List Tickets
```http
GET /api/cs/tickets
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| status | string | OPEN, IN_PROGRESS, WAITING, RESOLVED, CLOSED |
| priority | string | LOW, MEDIUM, HIGH, URGENT |
| accountId | string | Filter by account |

### Create Ticket
```http
POST /api/cs/tickets
```

**Request Body:**
```json
{
  "subject": "Integration Issue",
  "description": "API returning 500 errors...",
  "priority": "HIGH",
  "category": "TECHNICAL",
  "accountId": "acc_123...",
  "contactId": "contact_456..."
}
```

### Add Message to Ticket
```http
POST /api/cs/tickets/:id/messages
```

**Request Body:**
```json
{
  "content": "We've identified the issue...",
  "isInternal": false
}
```

---

## Health Scores API

### Get Account Health
```http
GET /api/cs/health/:accountId
```

**Response:**
```json
{
  "accountId": "acc_123...",
  "overallScore": 75,
  "riskLevel": "MEDIUM",
  "components": {
    "engagementScore": 80,
    "supportScore": 60,
    "adoptionScore": 85,
    "relationshipScore": 70,
    "growthScore": 75
  },
  "lastCalculated": "2024-01-15T10:00:00Z"
}
```

### Update Health Score
```http
PUT /api/cs/health/:accountId
```

---

## Renewals API

### List Renewals
```http
GET /api/cs/renewals
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| accountId | string | Filter by account |
| status | string | UPCOMING, IN_PROGRESS, RENEWED, CHURNED |
| upcomingDays | number | Renewals within X days |

### Create Renewal
```http
POST /api/cs/renewals
```

**Request Body:**
```json
{
  "accountId": "acc_123...",
  "contractName": "Enterprise License 2024",
  "contractValue": 120000,
  "startDate": "2024-01-01",
  "endDate": "2024-12-31",
  "probability": 80
}
```

---

## Campaigns API (Marketing)

### List Campaigns
```http
GET /api/marketing/campaigns
```

### Create Campaign
```http
POST /api/marketing/campaigns
```

**Request Body:**
```json
{
  "name": "Q1 Product Launch",
  "type": "EMAIL",
  "status": "DRAFT",
  "subject": "Introducing our new features",
  "content": "<html>...</html>",
  "segmentId": "seg_123..."
}
```

---

## Segments API

### List Segments
```http
GET /api/marketing/segments
```

### Create Segment
```http
POST /api/marketing/segments
```

**Request Body:**
```json
{
  "name": "Enterprise Leads",
  "type": "DYNAMIC",
  "description": "Leads from enterprise companies",
  "rules": {
    "operator": "AND",
    "conditions": [
      { "field": "company_size", "operator": "gte", "value": 500 }
    ]
  }
}
```

---

## Forms API

### List Forms
```http
GET /api/marketing/forms
```

### Get Form Submissions
```http
GET /api/marketing/forms/:id/submissions
```

---

## Invoices API

### List Invoices
```http
GET /api/invoices
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| status | string | DRAFT, SENT, PAID, OVERDUE, CANCELLED |
| accountId | string | Filter by account |

### Create Invoice
```http
POST /api/invoices
```

**Request Body:**
```json
{
  "accountId": "acc_123...",
  "contactId": "contact_456...",
  "issueDate": "2024-01-15",
  "dueDate": "2024-02-15",
  "items": [
    {
      "description": "Professional Services",
      "quantity": 10,
      "unitPrice": 150
    }
  ],
  "taxRate": 8.5
}
```

### Send Invoice
```http
POST /api/invoices/:id/send
```

### Record Payment
```http
POST /api/invoices/:id/payments
```

**Request Body:**
```json
{
  "amount": 1500,
  "paymentMethod": "BANK_TRANSFER",
  "reference": "TXN-123456"
}
```

### Generate PDF
```http
GET /api/invoices/:id/pdf
```

---

## Search API

### Global Search
```http
GET /api/search?q=acme
```

**Response:**
```json
{
  "results": [
    {
      "id": "acc_123...",
      "type": "account",
      "title": "Acme Corporation",
      "subtitle": "Technology",
      "href": "/accounts/acc_123..."
    },
    {
      "id": "lead_456...",
      "type": "lead",
      "title": "John Smith",
      "subtitle": "Acme Corp",
      "href": "/leads/lead_456..."
    }
  ]
}
```

---

## Notifications API

### List Notifications
```http
GET /api/notifications
```

### Mark as Read
```http
PATCH /api/notifications/:id
```

### Mark All as Read
```http
POST /api/notifications/mark-all-read
```

---

## Team API

### List Team Members
```http
GET /api/team
```

### Invite Member
```http
POST /api/team/invite
```

**Request Body:**
```json
{
  "email": "new.member@company.com",
  "roleId": "role_123..."
}
```

### Update Member Role
```http
PATCH /api/team/:userId
```

---

## Roles API

### List Roles
```http
GET /api/roles
```

### Create Role
```http
POST /api/roles
```

**Request Body:**
```json
{
  "name": "Sales Manager",
  "description": "Full access to sales modules",
  "permissions": {
    "leads": ["view", "create", "edit", "delete"],
    "contacts": ["view", "create", "edit"],
    "accounts": ["view", "create", "edit"]
  }
}
```

---

## AI Chat API

### Send Message
```http
POST /api/ai/chat
```

**Request Body:**
```json
{
  "messages": [
    { "role": "user", "content": "Create a lead for John Smith at Acme" }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "response": "Created lead for John Smith at Acme Corp (ID: lead_123...)",
  "toolsCalled": ["createLead"],
  "toolResults": [{ "success": true, "leadId": "lead_123..." }],
  "modelUsed": "gemini-2.0-flash"
}
```

---

## Export API

### Export Data
```http
POST /api/export
```

**Request Body:**
```json
{
  "module": "leads",
  "format": "csv",
  "filters": {
    "status": "QUALIFIED"
  }
}
```

---

## Import API

### Import Data
```http
POST /api/import
```

**Request Body (multipart/form-data):**
- `file`: CSV file
- `module`: Target module (leads, contacts, accounts)
- `mapping`: Field mapping JSON

---

## Audit Logs API

### List Audit Logs
```http
GET /api/audit-logs
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| module | string | Filter by module |
| action | string | CREATE, UPDATE, DELETE |
| userId | string | Filter by user |
| startDate | string | Filter from date |
| endDate | string | Filter to date |

---

## Error Responses

All API errors follow this format:

```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": {}
}
```

### Common Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| UNAUTHORIZED | 401 | Invalid or missing authentication |
| FORBIDDEN | 403 | Insufficient permissions |
| NOT_FOUND | 404 | Resource not found |
| VALIDATION_ERROR | 400 | Invalid request data |
| RATE_LIMITED | 429 | Too many requests |
| INTERNAL_ERROR | 500 | Server error |

---

## Rate Limits

| Endpoint Category | Limit |
|-------------------|-------|
| Standard API | 100 requests/minute |
| AI Chat | 20 requests/minute |
| Export | 5 requests/minute |
| Import | 2 requests/minute |

---

## Webhooks (Coming Soon)

Webhook support for real-time event notifications is planned for a future release.
