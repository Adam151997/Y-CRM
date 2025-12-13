# Y CRM - Performance Guide

## Overview

This guide covers performance optimization strategies for Y CRM, including database queries, caching, API design, and frontend optimization.

---

## Database Optimization

### Prisma Best Practices

#### 1. Use Select to Limit Fields

```typescript
// ❌ Bad - fetches all fields
const leads = await prisma.lead.findMany({
  where: { orgId }
});

// ✅ Good - fetches only needed fields
const leads = await prisma.lead.findMany({
  where: { orgId },
  select: {
    id: true,
    firstName: true,
    lastName: true,
    email: true,
    status: true,
  }
});
```

#### 2. Use Transactions for Parallel Queries

```typescript
// ❌ Bad - sequential queries
const leads = await prisma.lead.count({ where: { orgId } });
const contacts = await prisma.contact.count({ where: { orgId } });
const accounts = await prisma.account.count({ where: { orgId } });

// ✅ Good - parallel execution
const [leads, contacts, accounts] = await prisma.$transaction([
  prisma.lead.count({ where: { orgId } }),
  prisma.contact.count({ where: { orgId } }),
  prisma.account.count({ where: { orgId } }),
]);
```

#### 3. Pagination

Always paginate large result sets:

```typescript
const leads = await prisma.lead.findMany({
  where: { orgId },
  skip: (page - 1) * limit,
  take: limit,
  orderBy: { createdAt: 'desc' },
});
```

#### 4. Indexes

Ensure proper indexes exist for frequently queried fields:

```prisma
model Lead {
  id        String   @id
  orgId     String
  email     String
  status    String
  createdAt DateTime
  
  @@index([orgId])
  @@index([orgId, status])
  @@index([orgId, createdAt])
  @@index([email])
}
```

#### 5. Avoid N+1 Queries

```typescript
// ❌ Bad - N+1 query problem
const leads = await prisma.lead.findMany({ where: { orgId } });
for (const lead of leads) {
  const tasks = await prisma.task.findMany({ where: { leadId: lead.id } });
}

// ✅ Good - single query with include
const leads = await prisma.lead.findMany({
  where: { orgId },
  include: {
    tasks: {
      take: 5,
      orderBy: { dueDate: 'asc' }
    }
  }
});
```

---

## Caching Strategy

### Redis Caching

Y CRM uses Redis for caching frequently accessed data.

#### Cache Implementation

```typescript
import { cache } from "@/lib/cache";

// Get with cache
const stats = await cache.get(`dashboard:${orgId}`, async () => {
  return await computeDashboardStats(orgId);
}, { ttl: 300 }); // 5 minutes

// Invalidate on update
await cache.del(`dashboard:${orgId}`);
```

#### Cache Keys Convention

| Pattern | Description | TTL |
|---------|-------------|-----|
| `dashboard:{orgId}` | Dashboard stats | 5 min |
| `permissions:{userId}:{orgId}` | User permissions | 10 min |
| `health:{accountId}` | Health score | 15 min |
| `search:{orgId}:{hash}` | Search results | 2 min |

#### When to Cache

- **Do cache:**
  - Dashboard aggregations
  - Permission lookups
  - Static configuration
  - Expensive computations

- **Don't cache:**
  - Real-time data
  - User-specific lists
  - Frequently updated records

### React Query Caching

Frontend uses React Query for client-side caching:

```typescript
const { data: leads } = useQuery({
  queryKey: ['leads', filters],
  queryFn: () => fetchLeads(filters),
  staleTime: 30000, // 30 seconds
  cacheTime: 300000, // 5 minutes
});
```

---

## API Optimization

### Response Compression

Enable gzip compression in Next.js:

```javascript
// next.config.js
module.exports = {
  compress: true,
};
```

### API Route Patterns

#### 1. Use Route Handlers Efficiently

```typescript
// Use edge runtime for simple operations
export const runtime = 'edge';

// Use Node runtime for database operations
export const runtime = 'nodejs';
```

#### 2. Stream Large Responses

```typescript
export async function GET() {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      for await (const chunk of generateData()) {
        controller.enqueue(encoder.encode(JSON.stringify(chunk) + '\n'));
      }
      controller.close();
    }
  });
  
  return new Response(stream, {
    headers: { 'Content-Type': 'application/x-ndjson' }
  });
}
```

#### 3. Batch Operations

```typescript
// Support batch creates
export async function POST(req: Request) {
  const { records } = await req.json();
  
  if (records.length > 100) {
    return Response.json({ error: 'Max 100 records per batch' }, { status: 400 });
  }
  
  const results = await prisma.lead.createMany({
    data: records,
    skipDuplicates: true,
  });
  
  return Response.json(results);
}
```

---

## Frontend Performance

### Code Splitting

Next.js automatically code-splits by route. For component-level splitting:

```typescript
import dynamic from 'next/dynamic';

const HeavyChart = dynamic(() => import('./HeavyChart'), {
  loading: () => <Skeleton className="h-64" />,
  ssr: false,
});
```

### Image Optimization

Use Next.js Image component:

```tsx
import Image from 'next/image';

<Image
  src={logoUrl}
  alt="Logo"
  width={200}
  height={50}
  priority // for above-fold images
/>
```

### Bundle Size

Monitor and optimize bundle size:

```bash
# Analyze bundle
npm run build
npx @next/bundle-analyzer
```

**Tips:**
- Use tree-shakeable imports
- Avoid importing entire libraries
- Lazy load heavy components

```typescript
// ❌ Bad
import { format, parse, add, sub } from 'date-fns';

// ✅ Good
import format from 'date-fns/format';
```

### Virtualization

For long lists, use virtualization:

```tsx
import { useVirtualizer } from '@tanstack/react-virtual';

function VirtualList({ items }) {
  const parentRef = useRef(null);
  
  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 50,
  });
  
  return (
    <div ref={parentRef} className="h-[500px] overflow-auto">
      <div style={{ height: virtualizer.getTotalSize() }}>
        {virtualizer.getVirtualItems().map((virtualRow) => (
          <div
            key={virtualRow.index}
            style={{
              position: 'absolute',
              top: virtualRow.start,
              height: virtualRow.size,
            }}
          >
            {items[virtualRow.index].name}
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## Search Optimization

### Database Search

For basic searches, use Prisma's built-in operators:

```typescript
const results = await prisma.lead.findMany({
  where: {
    orgId,
    OR: [
      { firstName: { contains: query, mode: 'insensitive' } },
      { lastName: { contains: query, mode: 'insensitive' } },
      { email: { contains: query, mode: 'insensitive' } },
      { company: { contains: query, mode: 'insensitive' } },
    ],
  },
  take: 20,
});
```

### Full-Text Search

For better search performance, consider:

1. **PostgreSQL Full-Text Search**
```sql
CREATE INDEX leads_search_idx ON "Lead" 
USING gin(to_tsvector('english', "firstName" || ' ' || "lastName" || ' ' || "company"));
```

2. **External Search Service**
- Algolia
- Elasticsearch
- Meilisearch

---

## Rate Limiting

### Implementation

```typescript
import { rateLimit } from "@/lib/rate-limit";

export async function POST(req: Request) {
  const auth = await getApiAuthContext();
  
  const { success } = await rateLimit.check(auth.userId, {
    limit: 100,
    window: 60, // 1 minute
  });
  
  if (!success) {
    return Response.json(
      { error: 'Rate limit exceeded' },
      { status: 429 }
    );
  }
  
  // Process request...
}
```

### Recommended Limits

| Endpoint | Limit | Window |
|----------|-------|--------|
| Standard API | 100 | 1 min |
| AI Chat | 20 | 1 min |
| Search | 60 | 1 min |
| Export | 5 | 1 min |
| Import | 2 | 1 min |

---

## Monitoring

### Key Metrics

Track these metrics for performance monitoring:

| Metric | Target | Alert Threshold |
|--------|--------|-----------------|
| API Response Time (p95) | < 200ms | > 500ms |
| Database Query Time (p95) | < 50ms | > 200ms |
| Error Rate | < 0.1% | > 1% |
| Cache Hit Rate | > 80% | < 60% |

### Logging

Use structured logging for performance analysis:

```typescript
console.log(JSON.stringify({
  type: 'api_request',
  method: 'GET',
  path: '/api/leads',
  duration: endTime - startTime,
  status: 200,
  userId: auth.userId,
  orgId: auth.orgId,
}));
```

### Error Tracking

Integrate error tracking (Sentry, etc.):

```typescript
try {
  // Operation
} catch (error) {
  Sentry.captureException(error, {
    tags: { module: 'leads', action: 'create' },
    user: { id: userId },
  });
  throw error;
}
```

---

## Deployment Optimization

### Vercel Configuration

```javascript
// next.config.js
module.exports = {
  // Enable ISR for static pages
  experimental: {
    isrMemoryCacheSize: 50, // MB
  },
  
  // Headers for caching
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Cache-Control', value: 'no-store' },
        ],
      },
      {
        source: '/_next/static/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
    ];
  },
};
```

### Database Connection Pooling

For serverless environments:

```typescript
// lib/db.ts
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query'] : [],
});

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
```

### Edge Functions

Use edge functions for latency-sensitive operations:

```typescript
export const runtime = 'edge';
export const preferredRegion = ['iad1', 'sfo1']; // Multiple regions

export async function GET() {
  // Lightweight operation
}
```

---

## Checklist

### Before Production

- [ ] Database indexes created
- [ ] Redis caching configured
- [ ] Rate limiting enabled
- [ ] Error tracking integrated
- [ ] Bundle size analyzed
- [ ] Images optimized
- [ ] API responses compressed
- [ ] Connection pooling configured

### Regular Maintenance

- [ ] Monitor slow queries weekly
- [ ] Review cache hit rates
- [ ] Check error rates daily
- [ ] Analyze bundle size on releases
- [ ] Review rate limit thresholds monthly
