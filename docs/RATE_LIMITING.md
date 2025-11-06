# API Rate Limiting

## Overview

AgriClime Sentinel implements API rate limiting to prevent abuse, ensure fair usage, and protect server resources.

## Implementation

### Rate Limiting Middleware (`lib/middleware/rate-limit.ts`)

The application uses a token bucket algorithm for rate limiting with the following features:

- **In-memory storage**: Fast, suitable for single-server deployments
- **Automatic cleanup**: Expired entries are removed every minute
- **Client identification**: Uses IP address from various headers (supports proxies/load balancers)
- **Configurable limits**: Different presets for different use cases
- **Standard headers**: Returns `X-RateLimit-*` and `Retry-After` headers

### Rate Limit Presets

#### 1. Strict (10 requests/minute)
```typescript
RateLimitPresets.strict
```
- **Use case**: Sensitive endpoints (auth, payments, data modification)
- **Limit**: 10 requests per minute
- **Message**: "Too many requests. Please try again in a minute."

#### 2. Standard (60 requests/minute) ✅ Currently Used
```typescript
RateLimitPresets.standard
```
- **Use case**: Most API endpoints
- **Limit**: 60 requests per minute
- **Message**: "Rate limit exceeded. Please slow down your requests."
- **Applied to**:
  - `/api/air-quality`
  - `/api/severe-weather` (GET & POST)
  - `/api/climate-trends`

#### 3. Relaxed (120 requests/minute)
```typescript
RateLimitPresets.relaxed
```
- **Use case**: Public read-only endpoints
- **Limit**: 120 requests per minute
- **Message**: "Rate limit exceeded. Please try again shortly."

#### 4. Burst (30 requests/10 seconds)
```typescript
RateLimitPresets.burst
```
- **Use case**: Endpoints that might receive bursts of traffic
- **Limit**: 30 requests per 10 seconds
- **Message**: "Too many requests in a short time. Please wait a moment."

## Protected Endpoints

### Currently Rate Limited

| Endpoint | Method | Limit | Preset |
|----------|--------|-------|--------|
| `/api/air-quality` | GET | 60/min | Standard |
| `/api/severe-weather` | GET | 60/min | Standard |
| `/api/severe-weather` | POST | 60/min | Standard |
| `/api/climate-trends` | GET | 60/min | Standard |

### Response Headers

All rate-limited endpoints return these headers:

```
X-RateLimit-Remaining: 59
X-RateLimit-Reset: 2025-01-15T10:30:00.000Z
```

When rate limit is exceeded (429 status):

```
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 2025-01-15T10:30:00.000Z
Retry-After: 45
```

### Error Response

When rate limit is exceeded:

```json
{
  "error": "Rate limit exceeded. Please slow down your requests.",
  "retryAfter": 45,
  "resetTime": "2025-01-15T10:30:00.000Z"
}
```

## Usage in API Routes

### Basic Usage

```typescript
import { NextRequest, NextResponse } from "next/server";
import {
  rateLimit,
  RateLimitPresets,
  createRateLimitResponse,
  addRateLimitHeaders,
} from "@/lib/middleware/rate-limit";

export async function GET(request: NextRequest) {
  // Apply rate limiting
  const limiter = rateLimit(RateLimitPresets.standard);
  const rateLimitResult = limiter(request);

  if (!rateLimitResult.isAllowed) {
    return createRateLimitResponse(rateLimitResult);
  }

  try {
    // Your API logic here
    const data = await fetchData();
    
    const response = NextResponse.json({ data });
    
    // Add rate limit headers to successful response
    return addRateLimitHeaders(response, rateLimitResult);
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
```

### Custom Configuration

```typescript
const customLimiter = rateLimit({
  maxRequests: 100,
  windowMs: 60 * 1000, // 1 minute
  message: "Custom rate limit message",
});

const result = customLimiter(request);
```

## Production Considerations

### Current Implementation (Development/Single Server)

- ✅ In-memory storage (Map)
- ✅ Automatic cleanup
- ✅ Fast and simple
- ❌ Not suitable for multi-server deployments
- ❌ Resets on server restart

### Recommended for Production (Multi-Server)

Use **Redis** or **Upstash** for distributed rate limiting:

#### Option 1: Redis

```typescript
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export async function rateLimit(config: RateLimitConfig) {
  return async function checkRateLimit(request: Request) {
    const identifier = getClientIdentifier(request);
    const key = `ratelimit:${identifier}:${request.url}`;
    
    const count = await redis.incr(key);
    
    if (count === 1) {
      await redis.expire(key, Math.ceil(config.windowMs / 1000));
    }
    
    const isAllowed = count <= config.maxRequests;
    const remaining = Math.max(0, config.maxRequests - count);
    
    return { isAllowed, remaining, resetTime: Date.now() + config.windowMs };
  };
}
```

#### Option 2: Vercel Edge Config

For Vercel deployments, use Edge Config for distributed state:

```typescript
import { get } from "@vercel/edge-config";

// Use Edge Config for rate limiting state
```

#### Option 3: Upstash Rate Limit SDK

```bash
npm install @upstash/ratelimit
```

```typescript
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(60, "1 m"),
});

export async function GET(request: NextRequest) {
  const identifier = getClientIdentifier(request);
  const { success, limit, reset, remaining } = await ratelimit.limit(identifier);
  
  if (!success) {
    return new Response("Rate limit exceeded", { status: 429 });
  }
  
  // Continue with API logic
}
```

## Testing Rate Limits

### Manual Testing

```bash
# Test rate limit with curl
for i in {1..65}; do
  echo "Request $i:"
  curl -i http://localhost:3000/api/air-quality?lat=34.0522&lon=-118.2437
  echo ""
done
```

### Automated Testing

```typescript
import { rateLimit, RateLimitPresets } from '@/lib/middleware/rate-limit';

describe('Rate Limiting', () => {
  it('should allow requests within limit', () => {
    const limiter = rateLimit(RateLimitPresets.standard);
    const mockRequest = new Request('http://localhost/api/test');
    
    for (let i = 0; i < 60; i++) {
      const result = limiter(mockRequest);
      expect(result.isAllowed).toBe(true);
    }
  });
  
  it('should block requests exceeding limit', () => {
    const limiter = rateLimit(RateLimitPresets.standard);
    const mockRequest = new Request('http://localhost/api/test');
    
    // Make 60 requests (at limit)
    for (let i = 0; i < 60; i++) {
      limiter(mockRequest);
    }
    
    // 61st request should be blocked
    const result = limiter(mockRequest);
    expect(result.isAllowed).toBe(false);
  });
});
```

## Monitoring

### Metrics to Track

1. **Rate limit hits**: How often users hit the limit
2. **Top offenders**: IPs that frequently exceed limits
3. **Endpoint usage**: Which endpoints are most used
4. **Time patterns**: When rate limits are hit most

### Logging

Add logging to track rate limit events:

```typescript
if (!rateLimitResult.isAllowed) {
  // Log rate limit event
  console.warn('Rate limit exceeded', {
    ip: getClientIdentifier(request),
    endpoint: request.url,
    timestamp: new Date().toISOString(),
  });
  
  return createRateLimitResponse(rateLimitResult);
}
```

## Best Practices

1. **Set appropriate limits**: Balance user experience with server protection
2. **Use different limits for different endpoints**: Sensitive endpoints should have stricter limits
3. **Return helpful error messages**: Tell users when they can retry
4. **Monitor and adjust**: Track usage patterns and adjust limits accordingly
5. **Consider user tiers**: Authenticated users might get higher limits
6. **Implement exponential backoff**: For repeated violations
7. **Whitelist trusted IPs**: For internal services or partners

## Future Enhancements

- [ ] Migrate to Redis/Upstash for production
- [ ] Add user-based rate limiting (in addition to IP-based)
- [ ] Implement tiered rate limits (free vs. paid users)
- [ ] Add rate limit bypass for authenticated admin users
- [ ] Create rate limit monitoring dashboard
- [ ] Implement exponential backoff for repeat offenders
- [ ] Add IP whitelisting/blacklisting
- [ ] Track and alert on suspicious patterns

## Environment Variables

For production with Redis:

```bash
# .env.local
UPSTASH_REDIS_REST_URL=your_redis_url
UPSTASH_REDIS_REST_TOKEN=your_redis_token
```

## Support

For questions about rate limiting:
- [Upstash Rate Limit Documentation](https://upstash.com/docs/redis/features/ratelimiting)
- [Vercel Edge Config](https://vercel.com/docs/storage/edge-config)
- [Redis Rate Limiting Patterns](https://redis.io/docs/manual/patterns/rate-limiter/)

